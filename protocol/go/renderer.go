package lse

import (
	"fmt"
	"sort"
	"strings"
)

// RenderExplicit serializes a SemanticNode as explicit bracket syntax.
func RenderExplicit(node *SemanticNode) string {
	// Handle compound nodes
	if node.Kind == KindCompound {
		parts := make([]string, len(node.Statements))
		for i, stmt := range node.Statements {
			parts[i] = RenderExplicit(&stmt)
		}
		chain := node.ChainType
		if chain == "" {
			chain = "then"
		}
		return strings.Join(parts, " "+chain+" ")
	}

	parts := []string{node.Action}

	// Sort roles alphabetically for deterministic output
	roleNames := make([]string, 0, len(node.Roles))
	for role := range node.Roles {
		roleNames = append(roleNames, role)
	}
	sort.Strings(roleNames)

	// Add roles
	for _, role := range roleNames {
		value := node.Roles[role]
		if value.Type == TypeFlag {
			prefix := "+"
			if !value.Enabled {
				prefix = "~"
			}
			parts = append(parts, prefix+value.Name)
		} else {
			parts = append(parts, role+":"+valueToString(value))
		}
	}

	// Handle event handler body
	if node.Kind == KindEventHandler && len(node.Body) > 0 {
		bodyParts := make([]string, len(node.Body))
		for i, b := range node.Body {
			bodyParts[i] = RenderExplicit(&b)
		}
		parts = append(parts, "body:"+strings.Join(bodyParts, " "))
	}

	// Conditional branches (v1.1)
	if len(node.ThenBranch) > 0 {
		branchParts := make([]string, len(node.ThenBranch))
		for i, b := range node.ThenBranch {
			branchParts[i] = RenderExplicit(&b)
		}
		parts = append(parts, "then:"+strings.Join(branchParts, " "))
	}
	if len(node.ElseBranch) > 0 {
		branchParts := make([]string, len(node.ElseBranch))
		for i, b := range node.ElseBranch {
			branchParts[i] = RenderExplicit(&b)
		}
		parts = append(parts, "else:"+strings.Join(branchParts, " "))
	}

	// Loop fields (v1.1)
	if node.LoopVariant != "" {
		parts = append(parts, "loopVariant:"+node.LoopVariant)
	}
	if len(node.LoopBody) > 0 {
		bodyParts := make([]string, len(node.LoopBody))
		for i, b := range node.LoopBody {
			bodyParts[i] = RenderExplicit(&b)
		}
		parts = append(parts, "loop-body:"+strings.Join(bodyParts, " "))
	}
	if node.LoopVariable != "" {
		parts = append(parts, "loopVariable:"+fmt.Sprintf("%q", node.LoopVariable))
	}
	if node.IndexVariable != "" {
		parts = append(parts, "indexVariable:"+fmt.Sprintf("%q", node.IndexVariable))
	}

	return "[" + strings.Join(parts, " ") + "]"
}

// needsSelectorWrap reports whether a selector must be wrapped in "<.../>" to
// survive a re-parse.
//
// A bare token re-classifies as a selector only if it starts with one of
// '# . @ *'. A space would split the token, and a leading '[' in a structural role
// would re-parse as a nested command -- so both must wrap. ".a>.b" needs no
// wrapping: it has no space and keeps its leading '.'.
func needsSelectorWrap(value string) bool {
	if strings.Contains(value, " ") {
		return true
	}
	switch value[0] {
	case '#', '.', '@', '*':
		return false
	}
	return true
}

// valueToString converts a SemanticValue to its explicit syntax string form.
func valueToString(v SemanticValue) string {
	switch v.Type {
	case TypeLiteral:
		if v.Value == nil {
			return ""
		}
		switch val := v.Value.(type) {
		case string:
			if v.DataType == "string" || strings.ContainsAny(val, " \t\n\r") {
				return fmt.Sprintf("%q", val)
			}
			return val
		case bool:
			if val {
				return "true"
			}
			return "false"
		case int:
			return fmt.Sprintf("%d", val)
		case int64:
			return fmt.Sprintf("%d", val)
		case float64:
			if val == float64(int64(val)) {
				return fmt.Sprintf("%d", int64(val))
			}
			return fmt.Sprintf("%g", val)
		default:
			return fmt.Sprintf("%v", val)
		}

	case TypeSelector:
		if v.Value == nil {
			return ""
		}
		s := fmt.Sprintf("%v", v.Value)
		if s == "" {
			return s
		}
		if needsSelectorWrap(s) {
			return "<" + s + "/>"
		}
		return s

	case TypeReference:
		if v.Value == nil {
			return ""
		}
		return fmt.Sprintf("%v", v.Value)

	case TypeExpression, TypePropertyPath:
		return v.Raw

	case TypeFlag:
		return v.Name

	default:
		if v.Value != nil {
			return fmt.Sprintf("%v", v.Value)
		}
		return ""
	}
}
