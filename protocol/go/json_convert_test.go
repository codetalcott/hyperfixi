package lse

import (
	"testing"
)

func TestValidateJSONValid(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": map[string]any{"type": "selector", "value": ".active"},
		},
	}
	diags := ValidateJSON(data)
	if len(diags) != 0 {
		t.Errorf("expected 0 diagnostics, got %d: %v", len(diags), diags)
	}
}

func TestValidateJSONMissingAction(t *testing.T) {
	data := map[string]any{
		"roles": map[string]any{},
	}
	diags := ValidateJSON(data)
	if len(diags) != 1 || diags[0].Code != "INVALID_ACTION" {
		t.Errorf("expected INVALID_ACTION, got %v", diags)
	}
}

func TestValidateJSONInvalidRoleValue(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": "not-an-object",
		},
	}
	diags := ValidateJSON(data)
	found := false
	for _, d := range diags {
		if d.Code == "INVALID_ROLE_VALUE" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected INVALID_ROLE_VALUE, got %v", diags)
	}
}

func TestValidateJSONInvalidValueType(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": map[string]any{"type": "unknown", "value": ".active"},
		},
	}
	diags := ValidateJSON(data)
	found := false
	for _, d := range diags {
		if d.Code == "INVALID_VALUE_TYPE" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected INVALID_VALUE_TYPE, got %v", diags)
	}
}

func TestValidateJSONMissingValue(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": map[string]any{"type": "selector"},
		},
	}
	diags := ValidateJSON(data)
	found := false
	for _, d := range diags {
		if d.Code == "MISSING_VALUE" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected MISSING_VALUE, got %v", diags)
	}
}

func TestValidateJSONValidTrigger(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": map[string]any{"type": "selector", "value": ".active"},
		},
		"trigger": map[string]any{"event": "click"},
	}
	diags := ValidateJSON(data)
	if len(diags) != 0 {
		t.Errorf("expected 0 diagnostics, got %v", diags)
	}
}

func TestValidateJSONInvalidTrigger(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": map[string]any{"type": "selector", "value": ".active"},
		},
		"trigger": map[string]any{"event": ""},
	}
	diags := ValidateJSON(data)
	found := false
	for _, d := range diags {
		if d.Code == "INVALID_TRIGGER" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected INVALID_TRIGGER, got %v", diags)
	}
}

func TestValidateJSONFlagType(t *testing.T) {
	data := map[string]any{
		"action": "column",
		"roles": map[string]any{
			"primary-key": map[string]any{"type": "flag", "value": true},
		},
	}
	diags := ValidateJSON(data)
	if len(diags) != 0 {
		t.Errorf("expected 0 diagnostics, got %v", diags)
	}
}

func TestFromJSONBasicCommand(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": map[string]any{"type": "selector", "value": ".active"},
		},
	}
	node, err := FromJSON(data)
	if err != nil {
		t.Fatal(err)
	}
	if node.Kind != KindCommand {
		t.Errorf("kind = %q, want %q", node.Kind, KindCommand)
	}
	if node.Action != "toggle" {
		t.Errorf("action = %q, want %q", node.Action, "toggle")
	}
	if node.Roles["patient"].Type != TypeSelector {
		t.Errorf("patient type = %q, want %q", node.Roles["patient"].Type, TypeSelector)
	}
}

func TestFromJSONTriggerWrapsEventHandler(t *testing.T) {
	data := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient": map[string]any{"type": "selector", "value": ".active"},
		},
		"trigger": map[string]any{"event": "click"},
	}
	node, err := FromJSON(data)
	if err != nil {
		t.Fatal(err)
	}
	if node.Kind != KindEventHandler {
		t.Errorf("kind = %q, want %q", node.Kind, KindEventHandler)
	}
	if node.Action != "on" {
		t.Errorf("action = %q, want %q", node.Action, "on")
	}
	if len(node.Body) != 1 {
		t.Fatalf("body length = %d, want 1", len(node.Body))
	}
	if node.Body[0].Action != "toggle" {
		t.Errorf("body[0].action = %q, want %q", node.Body[0].Action, "toggle")
	}
}

func TestFromJSONFullFidelityEventHandler(t *testing.T) {
	data := map[string]any{
		"kind":   "event-handler",
		"action": "on",
		"roles": map[string]any{
			"event": map[string]any{"type": "literal", "value": "click", "dataType": "string"},
		},
		"body": []any{
			map[string]any{
				"kind":   "command",
				"action": "toggle",
				"roles": map[string]any{
					"patient": map[string]any{"type": "selector", "value": ".active"},
				},
			},
		},
	}
	node, err := FromJSON(data)
	if err != nil {
		t.Fatal(err)
	}
	if node.Kind != KindEventHandler {
		t.Errorf("kind = %q, want %q", node.Kind, KindEventHandler)
	}
	if len(node.Body) != 1 {
		t.Fatalf("body length = %d, want 1", len(node.Body))
	}
}

func TestFromJSONCompoundNode(t *testing.T) {
	data := map[string]any{
		"kind":      "compound",
		"action":    "compound",
		"chainType": "then",
		"statements": []any{
			map[string]any{
				"kind":   "command",
				"action": "add",
				"roles": map[string]any{
					"patient": map[string]any{"type": "selector", "value": ".loading"},
				},
			},
			map[string]any{
				"kind":   "command",
				"action": "fetch",
				"roles": map[string]any{
					"source": map[string]any{"type": "literal", "value": "/api/data", "dataType": "string"},
				},
			},
		},
	}
	node, err := FromJSON(data)
	if err != nil {
		t.Fatal(err)
	}
	if node.Kind != KindCompound {
		t.Errorf("kind = %q, want %q", node.Kind, KindCompound)
	}
	if node.ChainType != "then" {
		t.Errorf("chainType = %q, want %q", node.ChainType, "then")
	}
	if len(node.Statements) != 2 {
		t.Fatalf("statements length = %d, want 2", len(node.Statements))
	}
}

func TestToJSONBasicCommand(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "toggle",
		Roles: map[string]SemanticValue{
			"patient": SelectorValue(".active"),
		},
	}
	result := ToJSON(node)
	if result["action"] != "toggle" {
		t.Errorf("action = %v, want %q", result["action"], "toggle")
	}
	roles := result["roles"].(map[string]any)
	patient := roles["patient"].(map[string]any)
	if patient["type"] != "selector" {
		t.Errorf("patient type = %v, want %q", patient["type"], "selector")
	}
	if patient["value"] != ".active" {
		t.Errorf("patient value = %v, want %q", patient["value"], ".active")
	}
}

func TestToJSONFlag(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "column",
		Roles: map[string]SemanticValue{
			"name":        LiteralValue("id", "string"),
			"primary-key": FlagValue("primary-key", true),
		},
	}
	result := ToJSON(node)
	roles := result["roles"].(map[string]any)
	pk := roles["primary-key"].(map[string]any)
	if pk["type"] != "flag" {
		t.Errorf("type = %v, want %q", pk["type"], "flag")
	}
	if pk["name"] != "primary-key" {
		t.Errorf("name = %v, want %q", pk["name"], "primary-key")
	}
	if pk["enabled"] != true {
		t.Errorf("enabled = %v, want true", pk["enabled"])
	}
}

func TestRoundTripJSON(t *testing.T) {
	original := map[string]any{
		"action": "toggle",
		"roles": map[string]any{
			"patient":     map[string]any{"type": "selector", "value": ".active"},
			"destination": map[string]any{"type": "selector", "value": "#button"},
		},
	}
	node, err := FromJSON(original)
	if err != nil {
		t.Fatal(err)
	}
	result := ToJSON(node)
	if result["action"] != "toggle" {
		t.Errorf("action = %v, want %q", result["action"], "toggle")
	}
	roles := result["roles"].(map[string]any)
	patient := roles["patient"].(map[string]any)
	if patient["type"] != "selector" || patient["value"] != ".active" {
		t.Errorf("patient = %v, want selector .active", patient)
	}
}
