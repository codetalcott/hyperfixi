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
