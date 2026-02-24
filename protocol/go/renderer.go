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
			if value.Enabled != nil && !*value.Enabled {
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

	return "[" + strings.Join(parts, " ") + "]"
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

	case TypeSelector, TypeReference:
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
