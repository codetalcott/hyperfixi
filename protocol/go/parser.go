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
}

var (
	durationRE = regexp.MustCompile(`^(-?\d+(?:\.\d+)?)(ms|s|m|h)$`)
	numberRE   = regexp.MustCompile(`^(-?\d+(?:\.\d+)?)$`)
)

// IsExplicitSyntax checks if the input is explicit bracket syntax.
func IsExplicitSyntax(text string) bool {
	trimmed := strings.TrimSpace(text)
	return strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")
}

// ParseExplicit parses explicit bracket syntax into a SemanticNode.
func ParseExplicit(text string, opts *ParseOptions) (*SemanticNode, error) {
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

		// Handle nested explicit syntax for body
		if roleName == "body" && strings.HasPrefix(valueStr, "[") {
			nestedEnd := findMatchingBracket(token, colonIdx+1)
			nestedSyntax := token[colonIdx+1 : nestedEnd+1]
			roles[roleName] = ExpressionValue(nestedSyntax)
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

	return &SemanticNode{
		Kind:   KindCommand,
		Action: command,
		Roles:  roles,
	}, nil
}

// tokenize splits explicit syntax content on spaces, respecting quoted strings
// and bracket nesting.
func tokenize(content string) []string {
	var tokens []string
	var current strings.Builder
	inString := false
	stringChar := byte(0)
	bracketDepth := 0

	for i := 0; i < len(content); i++ {
		ch := content[i]

		if inString {
			current.WriteByte(ch)
			if ch == stringChar && (i == 0 || content[i-1] != '\\') {
				inString = false
			}
			continue
		}

		if ch == '"' || ch == '\'' {
			inString = true
			stringChar = ch
			current.WriteByte(ch)
			continue
		}

		if ch == '[' {
			bracketDepth++
			current.WriteByte(ch)
			continue
		}

		if ch == ']' {
			bracketDepth--
			current.WriteByte(ch)
			continue
		}

		if ch == ' ' && bracketDepth == 0 {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
			continue
		}

		current.WriteByte(ch)
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
