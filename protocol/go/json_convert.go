package lse

import (
	"fmt"
)

// Diagnostic represents a validation error or warning.
type Diagnostic struct {
	Severity string `json:"severity"`
	Code     string `json:"code"`
	Message  string `json:"message"`
}

// ValidateJSON validates a SemanticJSON map. Returns a slice of diagnostics (empty = valid).
func ValidateJSON(data map[string]any) []Diagnostic {
	var diags []Diagnostic

	// Check action
	action, _ := data["action"].(string)
	if action == "" {
		diags = append(diags, Diagnostic{
			Severity: "error",
			Code:     "INVALID_ACTION",
			Message:  "Missing or invalid 'action' field (must be a non-empty string)",
		})
	}

	// Check roles
	if roles, ok := data["roles"].(map[string]any); ok {
		for roleName, rv := range roles {
			roleValue, ok := rv.(map[string]any)
			if !ok {
				diags = append(diags, Diagnostic{
					Severity: "error",
					Code:     "INVALID_ROLE_VALUE",
					Message:  fmt.Sprintf("Role %q must be an object with type and value", roleName),
				})
				continue
			}

			vtype, _ := roleValue["type"].(string)
			validTypes := map[string]bool{
				"selector": true, "literal": true, "reference": true,
				"expression": true, "property-path": true, "flag": true,
			}
			if !validTypes[vtype] {
				diags = append(diags, Diagnostic{
					Severity: "error",
					Code:     "INVALID_VALUE_TYPE",
					Message:  fmt.Sprintf("Role %q has invalid type %q", roleName, vtype),
				})
			}

			_, hasValue := roleValue["value"]
			_, hasRaw := roleValue["raw"]
			if !hasValue && vtype != "expression" && !hasRaw {
				diags = append(diags, Diagnostic{
					Severity: "error",
					Code:     "MISSING_VALUE",
					Message:  fmt.Sprintf("Role %q is missing value field", roleName),
				})
			}
		}
	}

	// Check trigger
	if trigger, ok := data["trigger"].(map[string]any); ok {
		event, _ := trigger["event"].(string)
		if event == "" {
			diags = append(diags, Diagnostic{
				Severity: "error",
				Code:     "INVALID_TRIGGER",
				Message:  "Trigger must have a non-empty 'event' string",
			})
		}
	}

	return diags
}

// FromJSON converts a SemanticJSON map to a SemanticNode.
// Accepts both full-fidelity and LLM-simplified formats.
func FromJSON(data map[string]any) (*SemanticNode, error) {
	action, _ := data["action"].(string)
	rawRoles, _ := data["roles"].(map[string]any)

	roles := make(map[string]SemanticValue)
	for roleName, rv := range rawRoles {
		if roleMap, ok := rv.(map[string]any); ok {
			roles[roleName] = convertJSONValue(roleMap)
		}
	}

	// If trigger present, wrap in event handler
	if trigger, ok := data["trigger"].(map[string]any); ok {
		eventName, _ := trigger["event"].(string)
		eventRoles := map[string]SemanticValue{
			"event": LiteralValue(eventName, "string"),
		}
		bodyNode := SemanticNode{
			Kind:   KindCommand,
			Action: action,
			Roles:  roles,
		}
		return &SemanticNode{
			Kind:   KindEventHandler,
			Action: "on",
			Roles:  eventRoles,
			Body:   []SemanticNode{bodyNode},
		}, nil
	}

	// Check for full-fidelity format with kind
	kind := NodeKind("command")
	if k, ok := data["kind"].(string); ok && k != "" {
		kind = NodeKind(k)
	}

	if kind == KindEventHandler {
		var body []SemanticNode
		if bodyData, ok := data["body"].([]any); ok {
			for _, b := range bodyData {
				if bMap, ok := b.(map[string]any); ok {
					bodyNode, err := FromJSON(bMap)
					if err != nil {
						return nil, err
					}
					body = append(body, *bodyNode)
				}
			}
		}
		return &SemanticNode{
			Kind:   KindEventHandler,
			Action: action,
			Roles:  roles,
			Body:   body,
		}, nil
	}

	if kind == KindCompound {
		var stmts []SemanticNode
		if stmtsData, ok := data["statements"].([]any); ok {
			for _, s := range stmtsData {
				if sMap, ok := s.(map[string]any); ok {
					stmtNode, err := FromJSON(sMap)
					if err != nil {
						return nil, err
					}
					stmts = append(stmts, *stmtNode)
				}
			}
		}
		chainType, _ := data["chainType"].(string)
		if chainType == "" {
			chainType = "then"
		}
		return &SemanticNode{
			Kind:       KindCompound,
			Action:     action,
			Roles:      roles,
			Statements: stmts,
			ChainType:  chainType,
		}, nil
	}

	return &SemanticNode{
		Kind:   KindCommand,
		Action: action,
		Roles:  roles,
	}, nil
}

// ToJSON converts a SemanticNode to a full-fidelity JSON-friendly map.
func ToJSON(node *SemanticNode) map[string]any {
	m := map[string]any{
		"kind":   string(node.Kind),
		"action": node.Action,
		"roles":  marshalRoles(node.Roles),
	}
	if node.Kind == KindEventHandler && len(node.Body) > 0 {
		bodyMaps := make([]map[string]any, len(node.Body))
		for i := range node.Body {
			bodyMaps[i] = ToJSON(&node.Body[i])
		}
		m["body"] = bodyMaps
	}
	if node.Kind == KindCompound {
		stmtMaps := make([]map[string]any, len(node.Statements))
		for i := range node.Statements {
			stmtMaps[i] = ToJSON(&node.Statements[i])
		}
		m["statements"] = stmtMaps
		if node.ChainType != "" {
			m["chainType"] = node.ChainType
		}
	}
	return m
}

// convertJSONValue converts a JSON value object to a SemanticValue.
func convertJSONValue(data map[string]any) SemanticValue {
	vtype, _ := data["type"].(string)

	switch vtype {
	case "selector":
		val, _ := data["value"].(string)
		return SelectorValue(val)

	case "literal":
		value := data["value"]
		switch v := value.(type) {
		case bool:
			return LiteralValue(v, "boolean")
		case float64:
			// JSON numbers are always float64
			if v == float64(int64(v)) {
				return LiteralValue(int(v), "number")
			}
			return LiteralValue(v, "number")
		default:
			dataType, _ := data["dataType"].(string)
			if dataType == "" {
				dataType = "string"
			}
			s := fmt.Sprintf("%v", value)
			return LiteralValue(s, dataType)
		}

	case "reference":
		val := fmt.Sprintf("%v", data["value"])
		return ReferenceValue(val)

	case "expression":
		raw, _ := data["raw"].(string)
		if raw == "" {
			raw = fmt.Sprintf("%v", data["value"])
		}
		return ExpressionValue(raw)

	case "flag":
		name, _ := data["name"].(string)
		if name == "" {
			name = fmt.Sprintf("%v", data["value"])
		}
		enabled := true
		if e, ok := data["enabled"].(bool); ok {
			enabled = e
		}
		return FlagValue(name, enabled)

	case "property-path":
		val := fmt.Sprintf("%v", data["value"])
		return ExpressionValue(val)

	default:
		val := fmt.Sprintf("%v", data["value"])
		return LiteralValue(val, "string")
	}
}
