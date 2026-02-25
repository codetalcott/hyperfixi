package lse

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// ParseError is returned when explicit syntax is malformed.
type ParseError struct {
	Message string
}

func (e *ParseError) Error() string {
	return e.Message
}

// ParseOptions configures the parser.
type ParseOptions struct {
	// ReferenceSet overrides the default reference names.
	// If nil, DefaultReferences is used.
	ReferenceSet map[string]bool
	// MaxInputLength limits the maximum input length in bytes.
	// If > 0, inputs exceeding this length are rejected.
	// Recommended for server-side use to prevent resource exhaustion.
	MaxInputLength int
}

var (
	durationRE = regexp.MustCompile(`^(-?\d+(?:\.\d+)?)(ms|s|m|h)$`)
	numberRE   = regexp.MustCompile(`^(-?\d+(?:\.\d+)?)$`)
)

// structuralRoles are role names whose bracket-enclosed values may be nested commands.
var structuralRoles = map[string]bool{
	"body": true, "then": true, "else": true,
	"condition": true, "loop-body": true, "variable": true,
}

// isNestedCommand checks whether a bracket-enclosed value is a nested command
// (vs. an attribute selector). A value starting with '[' is a nested command if
// the inner content contains at least one ASCII space or ':' at bracket-depth 0.
func isNestedCommand(value string) bool {
	if len(value) < 2 {
		return false
	}
	inner := value[1 : len(value)-1]
	depth := 0
	for _, ch := range inner {
		if ch == '[' {
			depth++
		} else if ch == ']' {
			depth--
		} else if depth == 0 && (ch == ' ' || ch == ':') {
			return true
		}
	}
	return false
}

// IsExplicitSyntax checks if the input is explicit bracket syntax.
func IsExplicitSyntax(text string) bool {
	trimmed := strings.TrimSpace(text)
	return strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")
}

// ParseExplicit parses explicit bracket syntax into a SemanticNode.
func ParseExplicit(text string, opts *ParseOptions) (*SemanticNode, error) {
	// Check input length limit
	if opts != nil && opts.MaxInputLength > 0 && len(text) > opts.MaxInputLength {
		return nil, &ParseError{
			Message: fmt.Sprintf("Input length %d exceeds maximum allowed length %d", len(text), opts.MaxInputLength),
		}
	}

	refs := DefaultReferences
	if opts != nil && opts.ReferenceSet != nil {
		refs = opts.ReferenceSet
	}

	trimmed := strings.TrimSpace(text)

	if !strings.HasPrefix(trimmed, "[") || !strings.HasSuffix(trimmed, "]") {
		return nil, &ParseError{
			Message: "Explicit syntax must be wrapped in brackets: [command role:value ...]",
		}
	}

	content := strings.TrimSpace(trimmed[1 : len(trimmed)-1])
	if content == "" {
		return nil, &ParseError{Message: "Empty explicit statement"}
	}

	tokens := tokenize(content)
	if len(tokens) == 0 {
		return nil, &ParseError{Message: "No command specified in explicit statement"}
	}

	command := strings.ToLower(tokens[0])
	roles := make(map[string]SemanticValue)

	for i := 1; i < len(tokens); i++ {
		token := tokens[i]

		// Boolean flag: +name or ~name
		if strings.HasPrefix(token, "+") || strings.HasPrefix(token, "~") {
			enabled := strings.HasPrefix(token, "+")
			flagName := token[1:]
			if flagName == "" {
				return nil, &ParseError{
					Message: fmt.Sprintf("Empty flag name: %q", token),
				}
			}
			roles[flagName] = FlagValue(flagName, enabled)
			continue
		}

		// Role:value pair
		colonIdx := strings.Index(token, ":")
		if colonIdx == -1 {
			return nil, &ParseError{
				Message: fmt.Sprintf("Invalid role format: %q. Expected role:value or +flag", token),
			}
		}

		roleName := token[:colonIdx]
		valueStr := token[colonIdx+1:]

		// Handle nested explicit syntax for structural roles (body, then, else, etc.)
		if structuralRoles[roleName] && strings.HasPrefix(valueStr, "[") && isNestedCommand(valueStr) {
			roles[roleName] = ExpressionValue(valueStr)
			continue
		}

		value := parseValue(valueStr, refs)
		roles[roleName] = value
	}

	// Build appropriate node type
	if command == "on" {
		if _, hasEvent := roles["event"]; !hasEvent {
			return nil, &ParseError{
				Message: "Event handler requires event role: [on event:click ...]",
			}
		}

		var body []SemanticNode
		if bodyValue, hasBody := roles["body"]; hasBody && bodyValue.Type == TypeExpression {
			bodyNode, err := ParseExplicit(bodyValue.Raw, opts)
			if err != nil {
				return nil, err
			}
			body = append(body, *bodyNode)
		}

		// Remove body from roles (structural, not semantic)
		delete(roles, "body")

		return &SemanticNode{
			Kind:   KindEventHandler,
			Action: "on",
			Roles:  roles,
			Body:   body,
		}, nil
	}

	// Build command node, extracting structural roles into top-level fields
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: command,
		Roles:  roles,
	}

	// Extract conditional branches (v1.1)
	extractStructuralBranch(node, roles, "then", "thenBranch", opts)
	extractStructuralBranch(node, roles, "else", "elseBranch", opts)

	// Extract loop fields (v1.1)
	extractStructuralBranch(node, roles, "loop-body", "loopBody", opts)
	if lv, ok := roles["loopVariant"]; ok && lv.Type == TypeLiteral {
		if s, ok := lv.Value.(string); ok {
			node.LoopVariant = s
			delete(roles, "loopVariant")
		}
	}
	if lv, ok := roles["loopVariable"]; ok && lv.Type == TypeLiteral {
		if s, ok := lv.Value.(string); ok {
			node.LoopVariable = s
			delete(roles, "loopVariable")
		}
	}
	if iv, ok := roles["indexVariable"]; ok && iv.Type == TypeLiteral {
		if s, ok := iv.Value.(string); ok {
			node.IndexVariable = s
			delete(roles, "indexVariable")
		}
	}

	return node, nil
}

// extractStructuralBranch extracts a structural role (expression holding nested
// bracket syntax) into a top-level array field on the node, then removes it from roles.
func extractStructuralBranch(node *SemanticNode, roles map[string]SemanticValue, roleName string, fieldName string, opts *ParseOptions) {
	value, ok := roles[roleName]
	if !ok || value.Type != TypeExpression || value.Raw == "" {
		return
	}
	parsed, err := ParseExplicit(value.Raw, opts)
	if err != nil {
		return
	}
	switch fieldName {
	case "thenBranch":
		node.ThenBranch = []SemanticNode{*parsed}
	case "elseBranch":
		node.ElseBranch = []SemanticNode{*parsed}
	case "loopBody":
		node.LoopBody = []SemanticNode{*parsed}
	}
	delete(roles, roleName)
}

// countPrecedingBackslashes counts consecutive backslashes immediately
// before the rune at position pos in the rune slice.
func countPrecedingBackslashes(runes []rune, pos int) int {
	count := 0
	for j := pos - 1; j >= 0; j-- {
		if runes[j] == '\\' {
			count++
		} else {
			break
		}
	}
	return count
}

// tokenize splits explicit syntax content on spaces, respecting quoted strings
// and bracket nesting. Uses rune iteration for correct UTF-8 handling.
func tokenize(content string) []string {
	var tokens []string
	var current strings.Builder
	inString := false
	var stringChar rune
	bracketDepth := 0

	runes := []rune(content)

	for i, ch := range runes {
		if inString {
			current.WriteRune(ch)
			// A quote closes the string only if preceded by an even number of backslashes
			if ch == stringChar && countPrecedingBackslashes(runes, i)%2 == 0 {
				inString = false
			}
			continue
		}

		if ch == '"' || ch == '\'' {
			inString = true
			stringChar = ch
			current.WriteRune(ch)
			continue
		}

		if ch == '[' {
			bracketDepth++
			current.WriteRune(ch)
			continue
		}

		if ch == ']' {
			bracketDepth--
			current.WriteRune(ch)
			continue
		}

		if ch == ' ' && bracketDepth == 0 {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
			continue
		}

		current.WriteRune(ch)
	}

	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens
}

// parseValue classifies a value string into a SemanticValue.
// Detection priority: selector > string > boolean > reference > duration > number > plain.
func parseValue(valueStr string, refs map[string]bool) SemanticValue {
	if len(valueStr) == 0 {
		return LiteralValue("", "string")
	}

	// 1. CSS selector
	first := valueStr[0]
	if first == '#' || first == '.' || first == '[' || first == '@' || first == '*' {
		return SelectorValue(valueStr)
	}

	// 2. String literal
	if first == '"' || first == '\'' {
		inner := valueStr[1 : len(valueStr)-1]
		return LiteralValue(inner, "string")
	}

	// 3. Boolean
	if valueStr == "true" {
		return LiteralValue(true, "boolean")
	}
	if valueStr == "false" {
		return LiteralValue(false, "boolean")
	}

	// 4. Reference (case-insensitive)
	if IsValidReference(valueStr, refs) {
		return ReferenceValue(strings.ToLower(valueStr))
	}

	// 5. Duration
	if durationRE.MatchString(valueStr) {
		return LiteralValue(valueStr, "duration")
	}

	// 6. Number
	if m := numberRE.FindString(valueStr); m != "" {
		f, err := strconv.ParseFloat(m, 64)
		if err == nil {
			// Use int if it's a whole number
			if f == math.Trunc(f) && !strings.Contains(m, ".") {
				return LiteralValue(int(f), "number")
			}
			return LiteralValue(f, "number")
		}
	}

	// 7. Fallback: plain string
	return LiteralValue(valueStr, "string")
}

// findMatchingBracket finds the matching closing bracket starting from position start.
func findMatchingBracket(s string, start int) int {
	depth := 0
	for i := start; i < len(s); i++ {
		if s[i] == '[' {
			depth++
		} else if s[i] == ']' {
			depth--
			if depth == 0 {
				return i
			}
		}
	}
	return len(s) - 1
}
