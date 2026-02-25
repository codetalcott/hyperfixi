//! Conformance tests against shared test-fixtures/*.json files.

use lokascript_explicit::*;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// Returns the path to the shared test-fixtures directory.
fn fixtures_dir() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest.join("..").join("test-fixtures")
}

/// Load a fixture file as a JSON array.
fn load_fixtures(filename: &str) -> Vec<Value> {
    let path = fixtures_dir().join(filename);
    let data = fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!("Failed to read fixture file {}: {}", path.display(), e);
    });
    serde_json::from_str(&data).unwrap_or_else(|e| {
        panic!("Failed to parse {}: {}", filename, e);
    })
}

/// Compare parsed roles with expected roles from a fixture.
fn assert_roles_match(
    actual_roles: &std::collections::HashMap<String, SemanticValue>,
    expected_roles: &serde_json::Map<String, Value>,
    test_id: &str,
) {
    assert_eq!(
        actual_roles.len(),
        expected_roles.len(),
        "[{}] Role count mismatch: got {}, want {}",
        test_id,
        actual_roles.len(),
        expected_roles.len()
    );

    for (role_name, expected_raw) in expected_roles {
        let actual = actual_roles
            .get(role_name)
            .unwrap_or_else(|| panic!("[{}] Missing role: {}", test_id, role_name));

        let expected = expected_raw
            .as_object()
            .unwrap_or_else(|| panic!("[{}] Expected role {} to be an object", test_id, role_name));

        let expected_type = expected
            .get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("");
        assert_eq!(
            actual.value_type.to_string(),
            expected_type,
            "[{}] Role {} type mismatch",
            test_id,
            role_name
        );

        match expected_type {
            "flag" => {
                let expected_name = expected
                    .get("name")
                    .and_then(|n| n.as_str())
                    .unwrap_or("");
                assert_eq!(
                    actual.name.as_deref().unwrap_or(""),
                    expected_name,
                    "[{}] Flag name mismatch",
                    test_id
                );
                let expected_enabled = expected
                    .get("enabled")
                    .and_then(|e| e.as_bool())
                    .unwrap_or(true);
                assert_eq!(
                    actual.enabled,
                    expected_enabled,
                    "[{}] Flag enabled mismatch",
                    test_id
                );
            }
            "expression" => {
                let expected_raw = expected
                    .get("raw")
                    .and_then(|r| r.as_str())
                    .unwrap_or("");
                assert_eq!(
                    actual.raw.as_deref().unwrap_or(""),
                    expected_raw,
                    "[{}] Expression raw mismatch",
                    test_id
                );
            }
            _ => {
                let expected_value = expected.get("value");
                if let Some(ev) = expected_value {
                    assert!(
                        values_equal(&actual.value, ev),
                        "[{}] Role {} value mismatch: got {:?}, want {:?}",
                        test_id,
                        role_name,
                        actual.value,
                        ev
                    );
                }

                if let Some(expected_dt) = expected.get("dataType").and_then(|dt| dt.as_str()) {
                    assert_eq!(
                        actual.data_type.as_deref().unwrap_or(""),
                        expected_dt,
                        "[{}] Role {} dataType mismatch",
                        test_id,
                        role_name
                    );
                }
            }
        }
    }
}

/// Compare a DynValue with a serde_json::Value, handling type differences.
fn values_equal(actual: &Option<DynValue>, expected: &Value) -> bool {
    match (actual, expected) {
        (Some(DynValue::Integer(a)), Value::Number(n)) => {
            if let Some(e) = n.as_i64() {
                *a == e
            } else if let Some(e) = n.as_f64() {
                *a as f64 == e
            } else {
                false
            }
        }
        (Some(DynValue::Float(a)), Value::Number(n)) => {
            if let Some(e) = n.as_f64() {
                *a == e
            } else {
                false
            }
        }
        (Some(DynValue::Bool(a)), Value::Bool(e)) => *a == *e,
        (Some(DynValue::String(a)), Value::String(e)) => a == e,
        (None, _) => false,
        _ => false,
    }
}

// ---- Parse conformance ----

#[test]
fn test_parse_conformance() {
    let files = vec![
        "basic.json",
        "selectors.json",
        "literals.json",
        "references.json",
        "flags.json",
    ];

    for filename in files {
        let fixtures = load_fixtures(filename);
        for fixture in &fixtures {
            let obj = fixture.as_object().unwrap();

            // Skip error fixtures
            if obj.get("expectError") == Some(&Value::Bool(true)) {
                continue;
            }

            let expected = match obj.get("expected").and_then(|e| e.as_object()) {
                Some(e) => e,
                None => continue,
            };

            let id = obj
                .get("id")
                .and_then(|i| i.as_str())
                .unwrap_or("unknown");
            let input = obj.get("input").and_then(|i| i.as_str()).unwrap_or("");

            let node = parse_explicit(input, None)
                .unwrap_or_else(|e| panic!("[{}] Parse failed: {}", id, e));

            let expected_kind = expected
                .get("kind")
                .and_then(|k| k.as_str())
                .unwrap_or("");
            assert_eq!(
                node.kind.to_string(),
                expected_kind,
                "[{}] kind mismatch",
                id
            );

            let expected_action = expected
                .get("action")
                .and_then(|a| a.as_str())
                .unwrap_or("");
            assert_eq!(node.action, expected_action, "[{}] action mismatch", id);

            if let Some(expected_roles) = expected.get("roles").and_then(|r| r.as_object()) {
                assert_roles_match(&node.roles, expected_roles, id);
            }
        }
    }
}

// ---- Nested/event-handler conformance ----

#[test]
fn test_nested_conformance() {
    let fixtures = load_fixtures("nested.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let expected = match obj.get("expected").and_then(|e| e.as_object()) {
            Some(e) => e,
            None => continue,
        };

        let id = obj
            .get("id")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown");
        let input = obj.get("input").and_then(|i| i.as_str()).unwrap_or("");

        let node =
            parse_explicit(input, None).unwrap_or_else(|e| panic!("[{}] Parse failed: {}", id, e));

        let expected_kind = expected
            .get("kind")
            .and_then(|k| k.as_str())
            .unwrap_or("");
        assert_eq!(
            node.kind.to_string(),
            expected_kind,
            "[{}] kind mismatch",
            id
        );

        let expected_action = expected
            .get("action")
            .and_then(|a| a.as_str())
            .unwrap_or("");
        assert_eq!(node.action, expected_action, "[{}] action mismatch", id);

        if let Some(expected_roles) = expected.get("roles").and_then(|r| r.as_object()) {
            assert_roles_match(&node.roles, expected_roles, id);
        }

        if let Some(body_data) = expected.get("body").and_then(|b| b.as_array()) {
            assert_eq!(
                node.body.len(),
                body_data.len(),
                "[{}] body length mismatch",
                id
            );
            for (i, expected_body_raw) in body_data.iter().enumerate() {
                let expected_body = expected_body_raw.as_object().unwrap();
                let actual_body = &node.body[i];

                let e_kind = expected_body
                    .get("kind")
                    .and_then(|k| k.as_str())
                    .unwrap_or("");
                assert_eq!(
                    actual_body.kind.to_string(),
                    e_kind,
                    "[{}] body[{}].kind mismatch",
                    id,
                    i
                );

                let e_action = expected_body
                    .get("action")
                    .and_then(|a| a.as_str())
                    .unwrap_or("");
                assert_eq!(
                    actual_body.action, e_action,
                    "[{}] body[{}].action mismatch",
                    id, i
                );

                if let Some(e_roles) = expected_body.get("roles").and_then(|r| r.as_object()) {
                    assert_roles_match(
                        &actual_body.roles,
                        e_roles,
                        &format!("{}.body[{}]", id, i),
                    );
                }
            }
        }
    }
}

// ---- Error conformance ----

#[test]
fn test_error_conformance() {
    let fixtures = load_fixtures("errors.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        if obj.get("expectError") != Some(&Value::Bool(true)) {
            continue;
        }

        let id = obj
            .get("id")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown");
        let input = obj.get("input").and_then(|i| i.as_str()).unwrap_or("");
        let error_contains = obj
            .get("errorContains")
            .and_then(|e| e.as_str())
            .unwrap_or("");

        let result = parse_explicit(input, None);
        assert!(result.is_err(), "[{}] Expected error, got Ok", id);

        let err = result.unwrap_err();
        let err_lower = err.message.to_lowercase();
        let expected_lower = error_contains.to_lowercase();
        assert!(
            err_lower.contains(&expected_lower),
            "[{}] Expected '{}' in error, got: '{}'",
            id,
            error_contains,
            err.message
        );
    }
}

// ---- Helpers for v1.1 node array comparison ----

fn assert_node_array_match(
    actual: &[SemanticNode],
    expected: &[Value],
    test_id: &str,
    field_name: &str,
) {
    assert_eq!(
        actual.len(),
        expected.len(),
        "[{}] {} length mismatch: got {}, want {}",
        test_id,
        field_name,
        actual.len(),
        expected.len()
    );
    for (i, expected_raw) in expected.iter().enumerate() {
        let eb = expected_raw
            .as_object()
            .unwrap_or_else(|| panic!("[{}] {}[{}] is not an object", test_id, field_name, i));
        let ab = &actual[i];

        let e_kind = eb
            .get("kind")
            .and_then(|k| k.as_str())
            .unwrap_or("");
        assert_eq!(
            ab.kind.to_string(),
            e_kind,
            "[{}] {}[{}].kind mismatch",
            test_id,
            field_name,
            i
        );

        let e_action = eb
            .get("action")
            .and_then(|a| a.as_str())
            .unwrap_or("");
        assert_eq!(
            ab.action, e_action,
            "[{}] {}[{}].action mismatch",
            test_id, field_name, i
        );

        if let Some(e_roles) = eb.get("roles").and_then(|r| r.as_object()) {
            assert_roles_match(
                &ab.roles,
                e_roles,
                &format!("{}.{}[{}]", test_id, field_name, i),
            );
        }
    }
}

// ---- Structural roles conformance (v1.1) ----

#[test]
fn test_structural_roles_conformance() {
    let fixtures = load_fixtures("structural-roles.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let expected = match obj.get("expected").and_then(|e| e.as_object()) {
            Some(e) => e,
            None => continue,
        };

        let id = obj
            .get("id")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown");
        let input = obj.get("input").and_then(|i| i.as_str()).unwrap_or("");

        let node =
            parse_explicit(input, None).unwrap_or_else(|e| panic!("[{}] Parse failed: {}", id, e));

        let expected_kind = expected
            .get("kind")
            .and_then(|k| k.as_str())
            .unwrap_or("");
        assert_eq!(
            node.kind.to_string(),
            expected_kind,
            "[{}] kind mismatch",
            id
        );

        let expected_action = expected
            .get("action")
            .and_then(|a| a.as_str())
            .unwrap_or("");
        assert_eq!(node.action, expected_action, "[{}] action mismatch", id);

        if let Some(expected_roles) = expected.get("roles").and_then(|r| r.as_object()) {
            assert_roles_match(&node.roles, expected_roles, id);
        }

        if let Some(then_data) = expected.get("thenBranch").and_then(|t| t.as_array()) {
            assert_node_array_match(&node.then_branch, then_data, id, "thenBranch");
        }
    }
}

// ---- Conditional conformance (v1.1) ----

#[test]
fn test_conditionals_conformance() {
    let fixtures = load_fixtures("conditionals.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj
            .get("id")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown");

        // Parse fixtures (input + expected)
        if let Some(input) = obj.get("input").and_then(|i| i.as_str()) {
            if let Some(expected) = obj.get("expected").and_then(|e| e.as_object()) {
                let node = parse_explicit(input, None)
                    .unwrap_or_else(|e| panic!("[{}] Parse failed: {}", id, e));

                let expected_kind = expected
                    .get("kind")
                    .and_then(|k| k.as_str())
                    .unwrap_or("");
                assert_eq!(
                    node.kind.to_string(),
                    expected_kind,
                    "[{}] kind mismatch",
                    id
                );

                let expected_action = expected
                    .get("action")
                    .and_then(|a| a.as_str())
                    .unwrap_or("");
                assert_eq!(node.action, expected_action, "[{}] action mismatch", id);

                if let Some(expected_roles) = expected.get("roles").and_then(|r| r.as_object()) {
                    assert_roles_match(&node.roles, expected_roles, id);
                }

                if let Some(then_data) = expected.get("thenBranch").and_then(|t| t.as_array()) {
                    assert_node_array_match(&node.then_branch, then_data, id, "thenBranch");
                }
                if let Some(else_data) = expected.get("elseBranch").and_then(|e| e.as_array()) {
                    assert_node_array_match(&node.else_branch, else_data, id, "elseBranch");
                }
            }
        }

        // JSON round-trip fixtures (jsonInput + expectedRoundTrip)
        if let Some(json_input) = obj.get("jsonInput") {
            if obj.get("expectedRoundTrip") == Some(&Value::Bool(true)) {
                let node = from_json(json_input)
                    .unwrap_or_else(|e| panic!("[{}] from_json failed: {}", id, e));
                let json_out = to_json(&node);
                let node2 = from_json(&json_out)
                    .unwrap_or_else(|e| panic!("[{}] from_json (round-trip) failed: {}", id, e));

                assert_eq!(
                    node2.action, node.action,
                    "[{}] action not preserved",
                    id
                );
                assert_eq!(
                    node2.then_branch.len(),
                    node.then_branch.len(),
                    "[{}] thenBranch length not preserved",
                    id
                );
                assert_eq!(
                    node2.else_branch.len(),
                    node.else_branch.len(),
                    "[{}] elseBranch length not preserved",
                    id
                );
            }
        }
    }
}

// ---- Loop conformance (v1.1) ----

#[test]
fn test_loops_conformance() {
    let fixtures = load_fixtures("loops.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj
            .get("id")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown");

        let json_input = match obj.get("jsonInput") {
            Some(ji) => ji,
            None => continue,
        };
        if obj.get("expectedRoundTrip") != Some(&Value::Bool(true)) {
            continue;
        }

        let node = from_json(json_input)
            .unwrap_or_else(|e| panic!("[{}] from_json failed: {}", id, e));
        let json_out = to_json(&node);
        let node2 = from_json(&json_out)
            .unwrap_or_else(|e| panic!("[{}] from_json (round-trip) failed: {}", id, e));

        assert_eq!(
            node2.action, node.action,
            "[{}] action not preserved",
            id
        );
        assert_eq!(
            node2.loop_variant, node.loop_variant,
            "[{}] loopVariant not preserved",
            id
        );
        assert_eq!(
            node2.loop_body.len(),
            node.loop_body.len(),
            "[{}] loopBody length not preserved",
            id
        );
        assert_eq!(
            node2.loop_variable, node.loop_variable,
            "[{}] loopVariable not preserved",
            id
        );
        assert_eq!(
            node2.index_variable, node.index_variable,
            "[{}] indexVariable not preserved",
            id
        );
    }
}

// ---- Round-trip conformance ----

#[test]
fn test_round_trip_conformance() {
    let fixtures = load_fixtures("round-trip.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        if !obj.contains_key("roundtrip") {
            continue;
        }

        let id = obj
            .get("id")
            .and_then(|i| i.as_str())
            .unwrap_or("unknown");
        let input = obj.get("input").and_then(|i| i.as_str()).unwrap_or("");

        let node =
            parse_explicit(input, None).unwrap_or_else(|e| panic!("[{}] Parse failed: {}", id, e));
        let rendered = render_explicit(&node);
        let reparsed = parse_explicit(&rendered, None)
            .unwrap_or_else(|e| panic!("[{}] Reparse failed: {}", id, e));

        assert_eq!(
            reparsed.action, node.action,
            "[{}] action changed after round-trip",
            id
        );
        assert_eq!(
            reparsed.roles.len(),
            node.roles.len(),
            "[{}] role count changed after round-trip",
            id
        );

        for (role_name, orig_val) in &node.roles {
            let reparsed_val = reparsed
                .roles
                .get(role_name)
                .unwrap_or_else(|| panic!("[{}] role '{}' lost after round-trip", id, role_name));
            assert_eq!(
                reparsed_val.value_type, orig_val.value_type,
                "[{}] role '{}' type changed after round-trip",
                id, role_name
            );
        }
    }
}
