package lse

import (
	"strings"
	"testing"
)

func TestRenderBasicCommand(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "toggle",
		Roles: map[string]SemanticValue{
			"patient": SelectorValue(".active"),
		},
	}
	result := RenderExplicit(node)
	if result != "[toggle patient:.active]" {
		t.Errorf("got %q, want %q", result, "[toggle patient:.active]")
	}
}

func TestRenderMultipleRoles(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "put",
		Roles: map[string]SemanticValue{
			"patient":     LiteralValue("hello", "string"),
			"destination": SelectorValue("#output"),
		},
	}
	result := RenderExplicit(node)
	if !strings.HasPrefix(result, "[") || !strings.HasSuffix(result, "]") {
		t.Errorf("result not wrapped in brackets: %q", result)
	}
	if !strings.Contains(result, `patient:"hello"`) {
		t.Errorf("missing patient role in: %q", result)
	}
	if !strings.Contains(result, "destination:#output") {
		t.Errorf("missing destination role in: %q", result)
	}
}

func TestRenderReferenceValue(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "add",
		Roles: map[string]SemanticValue{
			"patient":     SelectorValue(".clicked"),
			"destination": ReferenceValue("me"),
		},
	}
	result := RenderExplicit(node)
	if !strings.Contains(result, "patient:.clicked") {
		t.Errorf("missing patient in: %q", result)
	}
	if !strings.Contains(result, "destination:me") {
		t.Errorf("missing destination in: %q", result)
	}
}

func TestRenderNumericValue(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "increment",
		Roles: map[string]SemanticValue{
			"destination": SelectorValue("#count"),
			"quantity":    LiteralValue(5, "number"),
		},
	}
	result := RenderExplicit(node)
	if !strings.Contains(result, "quantity:5") {
		t.Errorf("missing quantity in: %q", result)
	}
}

func TestRenderEnabledFlag(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "column",
		Roles: map[string]SemanticValue{
			"name":        LiteralValue("id", "string"),
			"primary-key": FlagValue("primary-key", true),
		},
	}
	result := RenderExplicit(node)
	if !strings.Contains(result, "+primary-key") {
		t.Errorf("missing +primary-key in: %q", result)
	}
	if strings.Contains(result, "primary-key:") {
		t.Errorf("flag should not use role:value syntax in: %q", result)
	}
}

func TestRenderDisabledFlag(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindCommand,
		Action: "field",
		Roles: map[string]SemanticValue{
			"name":     LiteralValue("email", "string"),
			"nullable": FlagValue("nullable", false),
		},
	}
	result := RenderExplicit(node)
	if !strings.Contains(result, "~nullable") {
		t.Errorf("missing ~nullable in: %q", result)
	}
}

func TestRenderCompoundThen(t *testing.T) {
	node := &SemanticNode{
		Kind:      KindCompound,
		Action:    "compound",
		ChainType: "then",
		Statements: []SemanticNode{
			{
				Kind:   KindCommand,
				Action: "add",
				Roles: map[string]SemanticValue{
					"patient": SelectorValue(".loading"),
				},
			},
			{
				Kind:   KindCommand,
				Action: "fetch",
				Roles: map[string]SemanticValue{
					"source": LiteralValue("/api/data", "string"),
				},
			},
		},
	}
	result := RenderExplicit(node)
	if !strings.Contains(result, "[add patient:.loading] then [fetch") {
		t.Errorf("unexpected compound render: %q", result)
	}
}

func TestRenderEventHandlerWithBody(t *testing.T) {
	node := &SemanticNode{
		Kind:   KindEventHandler,
		Action: "on",
		Roles: map[string]SemanticValue{
			"event": LiteralValue("click", "string"),
		},
		Body: []SemanticNode{
			{
				Kind:   KindCommand,
				Action: "toggle",
				Roles: map[string]SemanticValue{
					"patient": SelectorValue(".active"),
				},
			},
		},
	}
	result := RenderExplicit(node)
	if !strings.Contains(result, `event:"click"`) {
		t.Errorf("missing event in: %q", result)
	}
	if !strings.Contains(result, "body:[toggle patient:.active]") {
		t.Errorf("missing body in: %q", result)
	}
}
