package lse

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// fixturesDir returns the path to the shared test-fixtures directory.
func fixturesDir() string {
	_, filename, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(filename), "..", "test-fixtures")
}

func loadFixtures(t *testing.T, filename string) []map[string]any {
	t.Helper()
	path := filepath.Join(fixturesDir(), filename)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("Fixture file not found: %s", path)
		return nil
	}
	var fixtures []map[string]any
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatalf("Failed to parse %s: %v", filename, err)
	}
	return fixtures
}

// assertRolesMatch compares parsed roles with expected roles from a fixture.
func assertRolesMatch(t *testing.T, actualRoles map[string]SemanticValue, expectedRoles map[string]any, testID string) {
	t.Helper()

	// Check same keys
	if len(actualRoles) != len(expectedRoles) {
		t.Errorf("[%s] Role count: got %d, want %d", testID, len(actualRoles), len(expectedRoles))
		return
	}

	for roleName, expectedRaw := range expectedRoles {
		actual, ok := actualRoles[roleName]
		if !ok {
			t.Errorf("[%s] Missing role: %q", testID, roleName)
			continue
		}

		expected, ok := expectedRaw.(map[string]any)
		if !ok {
			t.Errorf("[%s] Expected role %q value is not an object", testID, roleName)
			continue
		}

		expectedType, _ := expected["type"].(string)
		if string(actual.Type) != expectedType {
			t.Errorf("[%s] Role %q type: got %q, want %q", testID, roleName, actual.Type, expectedType)
			continue
		}

		switch expectedType {
		case "flag":
			expectedName, _ := expected["name"].(string)
			if actual.Name != expectedName {
				t.Errorf("[%s] Flag name: got %q, want %q", testID, actual.Name, expectedName)
			}
			expectedEnabled, _ := expected["enabled"].(bool)
			if actual.Enabled != expectedEnabled {
				t.Errorf("[%s] Flag enabled: got %v, want %v", testID, actual.Enabled, expectedEnabled)
			}

		case "expression":
			expectedRaw, _ := expected["raw"].(string)
			if actual.Raw != expectedRaw {
				t.Errorf("[%s] Expression raw: got %q, want %q", testID, actual.Raw, expectedRaw)
			}

		default:
			expectedValue := expected["value"]
			if !valuesEqual(actual.Value, expectedValue) {
				t.Errorf("[%s] Role %q value: got %v (%T), want %v (%T)",
					testID, roleName, actual.Value, actual.Value, expectedValue, expectedValue)
			}

			if expectedDT, ok := expected["dataType"].(string); ok {
				if actual.DataType != expectedDT {
					t.Errorf("[%s] Role %q dataType: got %q, want %q", testID, roleName, actual.DataType, expectedDT)
				}
			}
		}
	}
}

// valuesEqual compares two values, handling JSON number type (float64) vs Go int.
func valuesEqual(actual, expected any) bool {
	// Handle numeric comparisons (JSON decodes all numbers as float64)
	switch a := actual.(type) {
	case int:
		switch e := expected.(type) {
		case float64:
			return float64(a) == e
		case int:
			return a == e
		}
	case float64:
		switch e := expected.(type) {
		case float64:
			return a == e
		case int:
			return a == float64(e)
		}
	case bool:
		if e, ok := expected.(bool); ok {
			return a == e
		}
	case string:
		if e, ok := expected.(string); ok {
			return a == e
		}
	}
	return fmt.Sprintf("%v", actual) == fmt.Sprintf("%v", expected)
}

// ---- Parse conformance ----

func TestParseConformance(t *testing.T) {
	files := []string{"basic.json", "selectors.json", "literals.json", "references.json", "flags.json"}
	for _, filename := range files {
		fixtures := loadFixtures(t, filename)
		for _, fixture := range fixtures {
			expected, ok := fixture["expected"].(map[string]any)
			if !ok || fixture["expectError"] == true {
				continue
			}
			id, _ := fixture["id"].(string)
			input, _ := fixture["input"].(string)

			t.Run(id, func(t *testing.T) {
				node, err := ParseExplicit(input, nil)
				if err != nil {
					t.Fatalf("Parse failed: %v", err)
				}

				expectedKind, _ := expected["kind"].(string)
				if string(node.Kind) != expectedKind {
					t.Errorf("kind: got %q, want %q", node.Kind, expectedKind)
				}

				expectedAction, _ := expected["action"].(string)
				if node.Action != expectedAction {
					t.Errorf("action: got %q, want %q", node.Action, expectedAction)
				}

				expectedRoles, _ := expected["roles"].(map[string]any)
				assertRolesMatch(t, node.Roles, expectedRoles, id)
			})
		}
	}
}

// ---- Nested/event-handler conformance ----

func TestNestedConformance(t *testing.T) {
	fixtures := loadFixtures(t, "nested.json")
	for _, fixture := range fixtures {
		expected, ok := fixture["expected"].(map[string]any)
		if !ok {
			continue
		}
		id, _ := fixture["id"].(string)
		input, _ := fixture["input"].(string)

		t.Run(id, func(t *testing.T) {
			node, err := ParseExplicit(input, nil)
			if err != nil {
				t.Fatalf("Parse failed: %v", err)
			}

			expectedKind, _ := expected["kind"].(string)
			if string(node.Kind) != expectedKind {
				t.Errorf("kind: got %q, want %q", node.Kind, expectedKind)
			}

			expectedAction, _ := expected["action"].(string)
			if node.Action != expectedAction {
				t.Errorf("action: got %q, want %q", node.Action, expectedAction)
			}

			expectedRoles, _ := expected["roles"].(map[string]any)
			assertRolesMatch(t, node.Roles, expectedRoles, id)

			if bodyData, ok := expected["body"].([]any); ok {
				if len(node.Body) != len(bodyData) {
					t.Fatalf("body length: got %d, want %d", len(node.Body), len(bodyData))
				}
				for i, expectedBodyRaw := range bodyData {
					expectedBody, ok := expectedBodyRaw.(map[string]any)
					if !ok {
						continue
					}
					actualBody := node.Body[i]

					eKind, _ := expectedBody["kind"].(string)
					if string(actualBody.Kind) != eKind {
						t.Errorf("body[%d].kind: got %q, want %q", i, actualBody.Kind, eKind)
					}

					eAction, _ := expectedBody["action"].(string)
					if actualBody.Action != eAction {
						t.Errorf("body[%d].action: got %q, want %q", i, actualBody.Action, eAction)
					}

					eRoles, _ := expectedBody["roles"].(map[string]any)
					assertRolesMatch(t, actualBody.Roles, eRoles, fmt.Sprintf("%s.body[%d]", id, i))
				}
			}
		})
	}
}

// ---- Error conformance ----

func TestErrorConformance(t *testing.T) {
	fixtures := loadFixtures(t, "errors.json")
	for _, fixture := range fixtures {
		if fixture["expectError"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		input, _ := fixture["input"].(string)
		errorContains, _ := fixture["errorContains"].(string)

		t.Run(id, func(t *testing.T) {
			_, err := ParseExplicit(input, nil)
			if err == nil {
				t.Fatal("Expected error, got nil")
			}

			errLower := strings.ToLower(err.Error())
			expectedLower := strings.ToLower(errorContains)
			if !strings.Contains(errLower, expectedLower) {
				t.Errorf("Expected %q in error, got: %q", errorContains, err.Error())
			}
		})
	}
}

// assertNodeArrayMatch compares a slice of SemanticNodes against expected JSON array.
func assertNodeArrayMatch(t *testing.T, actual []SemanticNode, expected []any, testID, fieldName string) {
	t.Helper()
	if len(actual) != len(expected) {
		t.Fatalf("[%s] %s length: got %d, want %d", testID, fieldName, len(actual), len(expected))
	}
	for i, expectedRaw := range expected {
		eb, ok := expectedRaw.(map[string]any)
		if !ok {
			continue
		}
		ab := actual[i]
		eKind, _ := eb["kind"].(string)
		if string(ab.Kind) != eKind {
			t.Errorf("[%s] %s[%d].kind: got %q, want %q", testID, fieldName, i, ab.Kind, eKind)
		}
		eAction, _ := eb["action"].(string)
		if ab.Action != eAction {
			t.Errorf("[%s] %s[%d].action: got %q, want %q", testID, fieldName, i, ab.Action, eAction)
		}
		if eRoles, ok := eb["roles"].(map[string]any); ok {
			assertRolesMatch(t, ab.Roles, eRoles, fmt.Sprintf("%s.%s[%d]", testID, fieldName, i))
		}
	}
}

// ---- Structural roles conformance (v1.1) ----

func TestStructuralRolesConformance(t *testing.T) {
	fixtures := loadFixtures(t, "structural-roles.json")
	for _, fixture := range fixtures {
		expected, ok := fixture["expected"].(map[string]any)
		if !ok {
			continue
		}
		id, _ := fixture["id"].(string)
		input, _ := fixture["input"].(string)

		t.Run(id, func(t *testing.T) {
			node, err := ParseExplicit(input, nil)
			if err != nil {
				t.Fatalf("Parse failed: %v", err)
			}

			expectedKind, _ := expected["kind"].(string)
			if string(node.Kind) != expectedKind {
				t.Errorf("kind: got %q, want %q", node.Kind, expectedKind)
			}

			expectedAction, _ := expected["action"].(string)
			if node.Action != expectedAction {
				t.Errorf("action: got %q, want %q", node.Action, expectedAction)
			}

			expectedRoles, _ := expected["roles"].(map[string]any)
			assertRolesMatch(t, node.Roles, expectedRoles, id)

			if thenData, ok := expected["thenBranch"].([]any); ok {
				assertNodeArrayMatch(t, node.ThenBranch, thenData, id, "thenBranch")
			}
		})
	}
}

// ---- Conditional conformance (v1.1) ----

func TestConditionalsConformance(t *testing.T) {
	fixtures := loadFixtures(t, "conditionals.json")
	for _, fixture := range fixtures {
		id, _ := fixture["id"].(string)

		// Parse fixtures (input + expected)
		if input, ok := fixture["input"].(string); ok {
			if expected, ok := fixture["expected"].(map[string]any); ok {
				t.Run(id+"_parse", func(t *testing.T) {
					node, err := ParseExplicit(input, nil)
					if err != nil {
						t.Fatalf("Parse failed: %v", err)
					}

					expectedKind, _ := expected["kind"].(string)
					if string(node.Kind) != expectedKind {
						t.Errorf("kind: got %q, want %q", node.Kind, expectedKind)
					}

					expectedAction, _ := expected["action"].(string)
					if node.Action != expectedAction {
						t.Errorf("action: got %q, want %q", node.Action, expectedAction)
					}

					expectedRoles, _ := expected["roles"].(map[string]any)
					assertRolesMatch(t, node.Roles, expectedRoles, id)

					if thenData, ok := expected["thenBranch"].([]any); ok {
						assertNodeArrayMatch(t, node.ThenBranch, thenData, id, "thenBranch")
					}
					if elseData, ok := expected["elseBranch"].([]any); ok {
						assertNodeArrayMatch(t, node.ElseBranch, elseData, id, "elseBranch")
					}
				})
			}
		}

		// JSON round-trip fixtures (jsonInput + expectedRoundTrip)
		if jsonInput, ok := fixture["jsonInput"].(map[string]any); ok {
			if fixture["expectedRoundTrip"] == true {
				t.Run(id+"_json_roundtrip", func(t *testing.T) {
					node, err := FromJSON(jsonInput)
					if err != nil {
						t.Fatalf("FromJSON failed: %v", err)
					}
					jsonOut := ToJSON(node)
					node2, err := FromJSON(jsonOut)
					if err != nil {
						t.Fatalf("FromJSON (round-trip) failed: %v", err)
					}

					if node2.Action != node.Action {
						t.Errorf("action: got %q, want %q", node2.Action, node.Action)
					}
					if len(node2.ThenBranch) != len(node.ThenBranch) {
						t.Errorf("thenBranch length: got %d, want %d", len(node2.ThenBranch), len(node.ThenBranch))
					}
					if len(node2.ElseBranch) != len(node.ElseBranch) {
						t.Errorf("elseBranch length: got %d, want %d", len(node2.ElseBranch), len(node.ElseBranch))
					}
				})
			}
		}
	}
}

// ---- Loop conformance (v1.1) ----

func TestLoopsConformance(t *testing.T) {
	fixtures := loadFixtures(t, "loops.json")
	for _, fixture := range fixtures {
		id, _ := fixture["id"].(string)

		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok || fixture["expectedRoundTrip"] != true {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if node2.Action != node.Action {
				t.Errorf("action: got %q, want %q", node2.Action, node.Action)
			}
			if node2.LoopVariant != node.LoopVariant {
				t.Errorf("loopVariant: got %q, want %q", node2.LoopVariant, node.LoopVariant)
			}
			if len(node2.LoopBody) != len(node.LoopBody) {
				t.Errorf("loopBody length: got %d, want %d", len(node2.LoopBody), len(node.LoopBody))
			}
			if node2.LoopVariable != node.LoopVariable {
				t.Errorf("loopVariable: got %q, want %q", node2.LoopVariable, node.LoopVariable)
			}
			if node2.IndexVariable != node.IndexVariable {
				t.Errorf("indexVariable: got %q, want %q", node2.IndexVariable, node.IndexVariable)
			}
		})
	}
}

// ---- Type constraints conformance (v1.2) ----

func TestTypeConstraintsConformance(t *testing.T) {
	fixtures := loadFixtures(t, "type-constraints.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if fixture["noDiagnostics"] == true {
				if node2.Diagnostics != nil {
					t.Errorf("expected nil diagnostics, got %v", node2.Diagnostics)
				}
			} else {
				if len(node2.Diagnostics) != len(node.Diagnostics) {
					t.Errorf("diagnostics length: got %d, want %d", len(node2.Diagnostics), len(node.Diagnostics))
				}
				for i, d := range node.Diagnostics {
					if i >= len(node2.Diagnostics) {
						break
					}
					d2 := node2.Diagnostics[i]
					if d2.Level != d.Level {
						t.Errorf("diagnostics[%d].level: got %q, want %q", i, d2.Level, d.Level)
					}
					if d2.Role != d.Role {
						t.Errorf("diagnostics[%d].role: got %q, want %q", i, d2.Role, d.Role)
					}
					if d2.Code != d.Code {
						t.Errorf("diagnostics[%d].code: got %q, want %q", i, d2.Code, d.Code)
					}
				}
			}
		})
	}
}

// ---- Annotations conformance (v1.2) ----

func TestAnnotationsConformance(t *testing.T) {
	fixtures := loadFixtures(t, "annotations.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if fixture["noAnnotations"] == true {
				if len(node2.Annotations) != 0 {
					t.Errorf("expected no annotations, got %d", len(node2.Annotations))
				}
				// Also verify the JSON output has no "annotations" key
				if _, hasAnns := jsonOut["annotations"]; hasAnns {
					t.Errorf("expected no 'annotations' key in JSON output")
				}
				return
			}

			if fixture["noAnnotationValue"] == true {
				if len(node2.Annotations) == 0 {
					t.Fatalf("expected at least one annotation")
				}
				if node2.Annotations[0].Value != "" {
					t.Errorf("expected empty annotation value, got %q", node2.Annotations[0].Value)
				}
				return
			}

			// Check annotation order
			if orderRaw, ok := fixture["annotationOrder"].([]any); ok {
				if len(node2.Annotations) != len(orderRaw) {
					t.Fatalf("annotation count: got %d, want %d", len(node2.Annotations), len(orderRaw))
				}
				for i, nameRaw := range orderRaw {
					expectedName, _ := nameRaw.(string)
					if node2.Annotations[i].Name != expectedName {
						t.Errorf("annotations[%d].name: got %q, want %q", i, node2.Annotations[i].Name, expectedName)
					}
				}
			}

			// General: round-trip preserves annotation count
			if len(node2.Annotations) != len(node.Annotations) {
				t.Errorf("annotation count: got %d, want %d", len(node2.Annotations), len(node.Annotations))
			}
			for i, a := range node.Annotations {
				if i >= len(node2.Annotations) {
					break
				}
				if node2.Annotations[i].Name != a.Name {
					t.Errorf("annotations[%d].name: got %q, want %q", i, node2.Annotations[i].Name, a.Name)
				}
				if node2.Annotations[i].Value != a.Value {
					t.Errorf("annotations[%d].value: got %q, want %q", i, node2.Annotations[i].Value, a.Value)
				}
			}
		})
	}
}

// ---- Try/catch conformance (v1.2) ----

func TestTryCatchConformance(t *testing.T) {
	fixtures := loadFixtures(t, "try-catch.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			// Check body length
			expectedBodyLen := len(jsonInput["body"].([]any))
			if len(node2.Body) != expectedBodyLen {
				t.Errorf("body length: got %d, want %d", len(node2.Body), expectedBodyLen)
			}

			if fixture["noCatch"] == true {
				if node2.CatchBranch != nil {
					t.Errorf("expected nil catchBranch, got %v", node2.CatchBranch)
				}
			} else if expectedCatch, ok := fixture["expectedCatchLength"].(float64); ok {
				if len(node2.CatchBranch) != int(expectedCatch) {
					t.Errorf("catchBranch length: got %d, want %d", len(node2.CatchBranch), int(expectedCatch))
				}
			}

			if fixture["noFinally"] == true {
				if node2.FinallyBranch != nil {
					t.Errorf("expected nil finallyBranch, got %v", node2.FinallyBranch)
				}
			} else if expectedFinally, ok := fixture["expectedFinallyLength"].(float64); ok {
				if len(node2.FinallyBranch) != int(expectedFinally) {
					t.Errorf("finallyBranch length: got %d, want %d", len(node2.FinallyBranch), int(expectedFinally))
				}
			}

			if expectedAnnCount, ok := fixture["expectedAnnotationCount"].(float64); ok {
				if len(node2.Annotations) != int(expectedAnnCount) {
					t.Errorf("annotations count: got %d, want %d", len(node2.Annotations), int(expectedAnnCount))
				}
			}
		})
	}
}

// ---- Async coordination conformance (v1.2) ----

func TestAsyncCoordinationConformance(t *testing.T) {
	fixtures := loadFixtures(t, "async-coordination.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if expectedVariant, ok := fixture["expectedAsyncVariant"].(string); ok {
				if node2.AsyncVariant != expectedVariant {
					t.Errorf("asyncVariant: got %q, want %q", node2.AsyncVariant, expectedVariant)
				}
			}

			if expectedLen, ok := fixture["expectedAsyncBodyLength"].(float64); ok {
				if len(node2.AsyncBody) != int(expectedLen) {
					t.Errorf("asyncBody length: got %d, want %d", len(node2.AsyncBody), int(expectedLen))
				}
			}

			if expectedAnnCount, ok := fixture["expectedAnnotationCount"].(float64); ok {
				if len(node2.Annotations) != int(expectedAnnCount) {
					t.Errorf("annotations count: got %d, want %d", len(node2.Annotations), int(expectedAnnCount))
				}
			}
		})
	}
}

// ---- Pipe conformance (v1.2) ----

func TestPipeConformance(t *testing.T) {
	fixtures := loadFixtures(t, "pipe.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if expectedChain, ok := fixture["expectedChainType"].(string); ok {
				if node2.ChainType != expectedChain {
					t.Errorf("chainType: got %q, want %q", node2.ChainType, expectedChain)
				}
			}

			if expectedCount, ok := fixture["expectedStatementCount"].(float64); ok {
				if len(node2.Statements) != int(expectedCount) {
					t.Errorf("statements count: got %d, want %d", len(node2.Statements), int(expectedCount))
				}
			}

			if fixture["notPipe"] == true {
				if node2.ChainType == "pipe" {
					t.Errorf("expected chainType != 'pipe', got 'pipe'")
				}
			}

			if expectedAnnCount, ok := fixture["expectedAnnotationCount"].(float64); ok {
				if len(node2.Annotations) != int(expectedAnnCount) {
					t.Errorf("annotations count: got %d, want %d", len(node2.Annotations), int(expectedAnnCount))
				}
			}
		})
	}
}

// ---- Match conformance (v1.2) ----

func TestMatchConformance(t *testing.T) {
	fixtures := loadFixtures(t, "match.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if expectedArmCount, ok := fixture["expectedArmCount"].(float64); ok {
				if len(node2.Arms) != int(expectedArmCount) {
					t.Fatalf("arms count: got %d, want %d", len(node2.Arms), int(expectedArmCount))
				}
			}

			if fixture["noDefaultArm"] == true {
				if node2.DefaultArm != nil {
					t.Errorf("expected nil defaultArm, got %v", node2.DefaultArm)
				}
			}

			if fixture["expectedDefaultArm"] == true {
				if len(node2.DefaultArm) == 0 {
					t.Errorf("expected non-empty defaultArm")
				}
			}

			// Check first arm body length if specified
			if expectedArmBodyLen, ok := fixture["expectedArmBodyLength"].(float64); ok {
				if len(node2.Arms) > 0 {
					if len(node2.Arms[0].Body) != int(expectedArmBodyLen) {
						t.Errorf("arms[0].body length: got %d, want %d", len(node2.Arms[0].Body), int(expectedArmBodyLen))
					}
				}
			}

			// Check first arm pattern type and value
			if expectedPatternType, ok := fixture["expectedArmPatternType"].(string); ok {
				if len(node2.Arms) > 0 {
					if string(node2.Arms[0].Pattern.Type) != expectedPatternType {
						t.Errorf("arms[0].pattern.type: got %q, want %q", node2.Arms[0].Pattern.Type, expectedPatternType)
					}
				}
			}
			if expectedPatternValue, ok := fixture["expectedArmPatternValue"].(string); ok {
				if len(node2.Arms) > 0 {
					if node2.Arms[0].Pattern.StringValue() != expectedPatternValue {
						t.Errorf("arms[0].pattern.value: got %q, want %q", node2.Arms[0].Pattern.StringValue(), expectedPatternValue)
					}
				}
			}
		})
	}
}

// ---- Version envelope conformance (v1.2) ----

func TestVersionEnvelopeConformance(t *testing.T) {
	fixtures := loadFixtures(t, "version-envelope.json")
	for _, fixture := range fixtures {
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			// Skip streaming-only fixtures
			continue
		}
		if fixture["expectedRoundTrip"] != true {
			continue
		}

		t.Run(id, func(t *testing.T) {
			if !IsEnvelope(jsonInput) {
				t.Fatalf("IsEnvelope: expected true")
			}

			env, err := FromEnvelopeJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromEnvelopeJSON failed: %v", err)
			}

			if expectedVersion, ok := fixture["expectedVersion"].(string); ok {
				if env.LSEVersion != expectedVersion {
					t.Errorf("lseVersion: got %q, want %q", env.LSEVersion, expectedVersion)
				}
			}

			if expectedNodeCount, ok := fixture["expectedNodeCount"].(float64); ok {
				if len(env.Nodes) != int(expectedNodeCount) {
					t.Errorf("nodes count: got %d, want %d", len(env.Nodes), int(expectedNodeCount))
				}
			}

			if expectedFeaturesRaw, ok := fixture["expectedFeatures"].([]any); ok {
				if len(env.Features) != len(expectedFeaturesRaw) {
					t.Errorf("features count: got %d, want %d", len(env.Features), len(expectedFeaturesRaw))
				}
				for i, f := range expectedFeaturesRaw {
					expectedFeature, _ := f.(string)
					if i < len(env.Features) && env.Features[i] != expectedFeature {
						t.Errorf("features[%d]: got %q, want %q", i, env.Features[i], expectedFeature)
					}
				}
			}

			// Round-trip: ToEnvelopeJSON then FromEnvelopeJSON
			jsonOut := ToEnvelopeJSON(env)
			env2, err := FromEnvelopeJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromEnvelopeJSON (round-trip) failed: %v", err)
			}
			if env2.LSEVersion != env.LSEVersion {
				t.Errorf("round-trip lseVersion: got %q, want %q", env2.LSEVersion, env.LSEVersion)
			}
			if len(env2.Nodes) != len(env.Nodes) {
				t.Errorf("round-trip nodes count: got %d, want %d", len(env2.Nodes), len(env.Nodes))
			}
		})
	}

	// Subtest: a bare node is NOT an envelope
	t.Run("bare_node_not_envelope", func(t *testing.T) {
		bare := map[string]any{
			"kind":   "command",
			"action": "toggle",
			"roles":  map[string]any{},
		}
		if IsEnvelope(bare) {
			t.Errorf("IsEnvelope: bare node should return false")
		}
	})
}

// ---- Expression values conformance (Phase 0) ----

func TestExpressionValuesConformance(t *testing.T) {
	fixtures := loadFixtures(t, "expression-values.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if expectedRaw, ok := fixture["expectedExpressionRaw"].(string); ok {
				// Find the role that holds an expression value
				for _, v := range node2.Roles {
					if v.Type == TypeExpression {
						if v.Raw != expectedRaw {
							t.Errorf("expression raw: got %q, want %q", v.Raw, expectedRaw)
						}
						return
					}
				}
				t.Errorf("no expression role found in node")
			}
		})
	}
}

// ---- Unicode values conformance (Phase 0) ----

func TestUnicodeValuesConformance(t *testing.T) {
	fixtures := loadFixtures(t, "unicode-values.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if expectedSel, ok := fixture["expectedSelectorValue"].(string); ok {
				for _, v := range node2.Roles {
					if v.Type == TypeSelector {
						if v.StringValue() != expectedSel {
							t.Errorf("selector value: got %q, want %q", v.StringValue(), expectedSel)
						}
						return
					}
				}
				t.Errorf("no selector role found")
			}

			if expectedLit, ok := fixture["expectedLiteralValue"].(string); ok {
				for _, v := range node2.Roles {
					if v.Type == TypeLiteral {
						if v.StringValue() != expectedLit {
							t.Errorf("literal value: got %q, want %q", v.StringValue(), expectedLit)
						}
						return
					}
				}
				t.Errorf("no literal role found")
			}

			if expectedRef, ok := fixture["expectedReferenceValue"].(string); ok {
				for _, v := range node2.Roles {
					if v.Type == TypeReference {
						if v.StringValue() != expectedRef {
							t.Errorf("reference value: got %q, want %q", v.StringValue(), expectedRef)
						}
						return
					}
				}
				t.Errorf("no reference role found")
			}
		})
	}
}

// ---- Deep nesting conformance (Phase 0) ----

func TestDeepNestingConformance(t *testing.T) {
	fixtures := loadFixtures(t, "deep-nesting.json")
	for _, fixture := range fixtures {
		if fixture["expectedRoundTrip"] != true {
			continue
		}
		id, _ := fixture["id"].(string)
		jsonInput, ok := fixture["jsonInput"].(map[string]any)
		if !ok {
			continue
		}

		t.Run(id, func(t *testing.T) {
			node, err := FromJSON(jsonInput)
			if err != nil {
				t.Fatalf("FromJSON failed: %v", err)
			}
			jsonOut := ToJSON(node)
			node2, err := FromJSON(jsonOut)
			if err != nil {
				t.Fatalf("FromJSON (round-trip) failed: %v", err)
			}

			if expectedVariant, ok := fixture["expectedAsyncVariant"].(string); ok {
				if node2.AsyncVariant != expectedVariant {
					t.Errorf("asyncVariant: got %q, want %q", node2.AsyncVariant, expectedVariant)
				}
			}

			if expectedLen, ok := fixture["expectedAsyncBodyLength"].(float64); ok {
				if len(node2.AsyncBody) != int(expectedLen) {
					t.Errorf("asyncBody length: got %d, want %d", len(node2.AsyncBody), int(expectedLen))
				}
			}

			// Verify round-trip action and kind are preserved
			if node2.Action != node.Action {
				t.Errorf("action: got %q, want %q", node2.Action, node.Action)
			}
			if node2.Kind != node.Kind {
				t.Errorf("kind: got %q, want %q", node2.Kind, node.Kind)
			}
		})
	}
}

// ---- Round-trip conformance ----

func TestRoundTripConformance(t *testing.T) {
	fixtures := loadFixtures(t, "round-trip.json")
	for _, fixture := range fixtures {
		if _, ok := fixture["roundtrip"]; !ok {
			continue
		}
		id, _ := fixture["id"].(string)
		input, _ := fixture["input"].(string)

		t.Run(id, func(t *testing.T) {
			node, err := ParseExplicit(input, nil)
			if err != nil {
				t.Fatalf("Parse failed: %v", err)
			}
			rendered := RenderExplicit(node)
			reparsed, err := ParseExplicit(rendered, nil)
			if err != nil {
				t.Fatalf("Reparse failed: %v", err)
			}

			if reparsed.Action != node.Action {
				t.Errorf("action changed after round-trip: %q -> %q", node.Action, reparsed.Action)
			}

			// Verify roles are semantically equal
			if len(reparsed.Roles) != len(node.Roles) {
				t.Errorf("role count changed: %d -> %d", len(node.Roles), len(reparsed.Roles))
			}
			for roleName, origVal := range node.Roles {
				reparsedVal, ok := reparsed.Roles[roleName]
				if !ok {
					t.Errorf("role %q lost after round-trip", roleName)
					continue
				}
				if origVal.Type != reparsedVal.Type {
					t.Errorf("role %q type changed: %q -> %q", roleName, origVal.Type, reparsedVal.Type)
				}
			}
		})
	}
}
