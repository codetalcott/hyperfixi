package lse

import (
	"strings"
	"testing"
)

func TestIsExplicitSyntax(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"[toggle patient:.active]", true},
		{"  [toggle patient:.active]  ", true},
		{"toggle .active", false},
		{"[incomplete", false},
		{"incomplete]", false},
		{"", false},
	}

	for _, tc := range tests {
		got := IsExplicitSyntax(tc.input)
		if got != tc.expected {
			t.Errorf("IsExplicitSyntax(%q) = %v, want %v", tc.input, got, tc.expected)
		}
	}
}

func TestParseBasicCommand(t *testing.T) {
	node, err := ParseExplicit("[toggle patient:.active destination:#button]", nil)
	if err != nil {
		t.Fatal(err)
	}
	if node.Kind != KindCommand {
		t.Errorf("kind = %q, want %q", node.Kind, KindCommand)
	}
	if node.Action != "toggle" {
		t.Errorf("action = %q, want %q", node.Action, "toggle")
	}
	if v := node.Roles["patient"]; v.Type != TypeSelector || v.StringValue() != ".active" {
		t.Errorf("patient = %+v, want selector .active", v)
	}
	if v := node.Roles["destination"]; v.Type != TypeSelector || v.StringValue() != "#button" {
		t.Errorf("destination = %+v, want selector #button", v)
	}
}

func TestParseCommandNameLowercased(t *testing.T) {
	node, err := ParseExplicit("[Toggle patient:.active]", nil)
	if err != nil {
		t.Fatal(err)
	}
	if node.Action != "toggle" {
		t.Errorf("action = %q, want %q", node.Action, "toggle")
	}
}

func TestParseSelectorValues(t *testing.T) {
	node, err := ParseExplicit("[add patient:.highlight destination:#output]", nil)
	if err != nil {
		t.Fatal(err)
	}
	if v := node.Roles["patient"]; v.Type != TypeSelector || v.StringValue() != ".highlight" {
		t.Errorf("patient = %+v, want selector .highlight", v)
	}
}

func TestParseStringLiteral(t *testing.T) {
	node, err := ParseExplicit(`[put patient:"hello world" destination:#output]`, nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["patient"]
	if v.Type != TypeLiteral || v.StringValue() != "hello world" || v.DataType != "string" {
		t.Errorf("patient = %+v, want literal 'hello world' string", v)
	}
}

func TestParseBooleanTrue(t *testing.T) {
	node, err := ParseExplicit("[set destination:myVar goal:true]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["goal"]
	if v.Type != TypeLiteral || v.Value != true || v.DataType != "boolean" {
		t.Errorf("goal = %+v, want literal true boolean", v)
	}
}

func TestParseBooleanFalse(t *testing.T) {
	node, err := ParseExplicit("[set destination:myVar goal:false]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["goal"]
	if v.Type != TypeLiteral || v.Value != false || v.DataType != "boolean" {
		t.Errorf("goal = %+v, want literal false boolean", v)
	}
}

func TestParseNumericInteger(t *testing.T) {
	node, err := ParseExplicit("[increment destination:count quantity:5]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["quantity"]
	if v.Type != TypeLiteral || v.Value != 5 || v.DataType != "number" {
		t.Errorf("quantity = %+v, want literal 5 number", v)
	}
}

func TestParseNumericDecimal(t *testing.T) {
	node, err := ParseExplicit("[set destination:ratio goal:3.14]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["goal"]
	if v.Type != TypeLiteral || v.Value != 3.14 || v.DataType != "number" {
		t.Errorf("goal = %+v, want literal 3.14 number", v)
	}
}

func TestParseDurationMs(t *testing.T) {
	node, err := ParseExplicit("[wait duration:500ms]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["duration"]
	if v.Type != TypeLiteral || v.StringValue() != "500ms" || v.DataType != "duration" {
		t.Errorf("duration = %+v, want literal 500ms duration", v)
	}
}

func TestParseDurationS(t *testing.T) {
	node, err := ParseExplicit("[wait duration:2s]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["duration"]
	if v.Type != TypeLiteral || v.StringValue() != "2s" || v.DataType != "duration" {
		t.Errorf("duration = %+v, want literal 2s duration", v)
	}
}

func TestParseReferenceMe(t *testing.T) {
	node, err := ParseExplicit("[add patient:.active destination:me]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["destination"]
	if v.Type != TypeReference || v.StringValue() != "me" {
		t.Errorf("destination = %+v, want reference me", v)
	}
}

func TestParseReferenceCaseInsensitive(t *testing.T) {
	node, err := ParseExplicit("[add patient:.active destination:Me]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["destination"]
	if v.Type != TypeReference || v.StringValue() != "me" {
		t.Errorf("destination = %+v, want reference me", v)
	}
}

func TestParsePlainStringFallback(t *testing.T) {
	node, err := ParseExplicit("[fetch source:/api/users responseType:json]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["source"]
	if v.Type != TypeLiteral || v.StringValue() != "/api/users" || v.DataType != "string" {
		t.Errorf("source = %+v, want literal /api/users string", v)
	}
	v2 := node.Roles["responseType"]
	if v2.Type != TypeLiteral || v2.StringValue() != "json" || v2.DataType != "string" {
		t.Errorf("responseType = %+v, want literal json string", v2)
	}
}

func TestParseEventHandler(t *testing.T) {
	node, err := ParseExplicit("[on event:click body:[toggle patient:.active]]", nil)
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
	if node.Body[0].Kind != KindCommand {
		t.Errorf("body[0].kind = %q, want %q", node.Body[0].Kind, KindCommand)
	}
	if node.Body[0].Action != "toggle" {
		t.Errorf("body[0].action = %q, want %q", node.Body[0].Action, "toggle")
	}
}

func TestParseEnabledFlag(t *testing.T) {
	node, err := ParseExplicit("[column name:id +primary-key]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["primary-key"]
	if v.Type != TypeFlag || v.Name != "primary-key" || v.Enabled == nil || !*v.Enabled {
		t.Errorf("primary-key = %+v, want flag primary-key enabled", v)
	}
}

func TestParseDisabledFlag(t *testing.T) {
	node, err := ParseExplicit("[field name:email ~nullable]", nil)
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["nullable"]
	if v.Type != TypeFlag || v.Name != "nullable" || v.Enabled == nil || *v.Enabled {
		t.Errorf("nullable = %+v, want flag nullable disabled", v)
	}
}

func TestParseMultipleFlags(t *testing.T) {
	node, err := ParseExplicit("[column name:id type:uuid +primary-key +not-null]", nil)
	if err != nil {
		t.Fatal(err)
	}
	pk := node.Roles["primary-key"]
	if pk.Type != TypeFlag || !*pk.Enabled {
		t.Errorf("primary-key = %+v, want enabled flag", pk)
	}
	nn := node.Roles["not-null"]
	if nn.Type != TypeFlag || !*nn.Enabled {
		t.Errorf("not-null = %+v, want enabled flag", nn)
	}
}

func TestParseMixedFlags(t *testing.T) {
	node, err := ParseExplicit("[field name:email +required ~nullable]", nil)
	if err != nil {
		t.Fatal(err)
	}
	req := node.Roles["required"]
	if req.Type != TypeFlag || !*req.Enabled {
		t.Errorf("required = %+v, want enabled flag", req)
	}
	nul := node.Roles["nullable"]
	if nul.Type != TypeFlag || *nul.Enabled {
		t.Errorf("nullable = %+v, want disabled flag", nul)
	}
}

func TestParseFlagsOnly(t *testing.T) {
	node, err := ParseExplicit("[widget +draggable +resizable]", nil)
	if err != nil {
		t.Fatal(err)
	}
	d := node.Roles["draggable"]
	if d.Type != TypeFlag || !*d.Enabled {
		t.Errorf("draggable = %+v, want enabled flag", d)
	}
	r := node.Roles["resizable"]
	if r.Type != TypeFlag || !*r.Enabled {
		t.Errorf("resizable = %+v, want enabled flag", r)
	}
}

// Error cases

func TestParseErrorMissingBrackets(t *testing.T) {
	_, err := ParseExplicit("toggle patient:.active", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "brackets") {
		t.Errorf("error = %q, want to contain 'brackets'", err.Error())
	}
}

func TestParseErrorEmptyBrackets(t *testing.T) {
	_, err := ParseExplicit("[]", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "Empty") {
		t.Errorf("error = %q, want to contain 'Empty'", err.Error())
	}
}

func TestParseErrorWhitespaceBrackets(t *testing.T) {
	_, err := ParseExplicit("[  ]", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "Empty") {
		t.Errorf("error = %q, want to contain 'Empty'", err.Error())
	}
}

func TestParseErrorMissingColon(t *testing.T) {
	_, err := ParseExplicit("[toggle active]", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "role:value") {
		t.Errorf("error = %q, want to contain 'role:value'", err.Error())
	}
}

func TestParseErrorMissingEventRole(t *testing.T) {
	_, err := ParseExplicit("[on body:[toggle patient:.active]]", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "event") {
		t.Errorf("error = %q, want to contain 'event'", err.Error())
	}
}

func TestParseErrorEmptyFlagPlus(t *testing.T) {
	_, err := ParseExplicit("[column name:id +]", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "Empty flag") {
		t.Errorf("error = %q, want to contain 'Empty flag'", err.Error())
	}
}

func TestParseErrorEmptyFlagTilde(t *testing.T) {
	_, err := ParseExplicit("[column name:id ~]", nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "Empty flag") {
		t.Errorf("error = %q, want to contain 'Empty flag'", err.Error())
	}
}

func TestCustomReferenceSet(t *testing.T) {
	refs := map[string]bool{"self": true, "parent": true}
	node, err := ParseExplicit("[add patient:.active destination:self]", &ParseOptions{ReferenceSet: refs})
	if err != nil {
		t.Fatal(err)
	}
	v := node.Roles["destination"]
	if v.Type != TypeReference || v.StringValue() != "self" {
		t.Errorf("destination = %+v, want reference self", v)
	}
}

func TestCustomReferenceSetExcludesDefaults(t *testing.T) {
	refs := map[string]bool{"self": true}
	node, err := ParseExplicit("[add patient:.active destination:me]", &ParseOptions{ReferenceSet: refs})
	if err != nil {
		t.Fatal(err)
	}
	// 'me' is NOT in custom set, so it becomes a string literal
	v := node.Roles["destination"]
	if v.Type != TypeLiteral || v.StringValue() != "me" || v.DataType != "string" {
		t.Errorf("destination = %+v, want literal me string", v)
	}
}
