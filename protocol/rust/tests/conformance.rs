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

// ---- v1.2 conformance tests ----

#[test]
fn test_type_constraints_conformance() {
    let fixtures = load_fixtures("type-constraints.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);
        assert_eq!(
            node2.diagnostics.len(),
            node.diagnostics.len(),
            "[{}] diagnostics length not preserved",
            id
        );

        // Verify no-diagnostics case
        if obj.get("noDiagnostics") == Some(&Value::Bool(true)) {
            assert!(node.diagnostics.is_empty(), "[{}] expected no diagnostics", id);
        }

        // Verify diagnostics fields round-trip
        for (i, (d1, d2)) in node.diagnostics.iter().zip(node2.diagnostics.iter()).enumerate() {
            assert_eq!(d1.level, d2.level, "[{}] diagnostics[{}].level not preserved", id, i);
            assert_eq!(d1.role, d2.role, "[{}] diagnostics[{}].role not preserved", id, i);
            assert_eq!(d1.code, d2.code, "[{}] diagnostics[{}].code not preserved", id, i);
            assert_eq!(d1.message, d2.message, "[{}] diagnostics[{}].message not preserved", id, i);
        }
    }
}

#[test]
fn test_annotations_conformance() {
    let fixtures = load_fixtures("annotations.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);
        assert_eq!(
            node2.annotations.len(),
            node.annotations.len(),
            "[{}] annotations length not preserved",
            id
        );

        // No-annotations case: ensure annotations field is absent in output
        if obj.get("noAnnotations") == Some(&Value::Bool(true)) {
            assert!(node.annotations.is_empty(), "[{}] expected no annotations", id);
            assert!(json_out.get("annotations").is_none(), "[{}] annotations field should be absent", id);
        }

        // Verify no-value annotation doesn't emit "value" key
        if obj.get("noAnnotationValue") == Some(&Value::Bool(true)) {
            assert!(!node.annotations.is_empty(), "[{}] expected at least one annotation", id);
            let ann = &node.annotations[0];
            assert!(ann.value.is_none(), "[{}] annotation value should be None", id);
            // In the JSON output, value field should be absent
            if let Some(ann_arr) = json_out.get("annotations").and_then(|a| a.as_array()) {
                let first_ann = &ann_arr[0];
                assert!(first_ann.get("value").is_none(), "[{}] value should not be in JSON output", id);
            }
        }

        // Annotation order check
        if let Some(expected_order) = obj.get("annotationOrder").and_then(|o| o.as_array()) {
            for (i, expected_name) in expected_order.iter().enumerate() {
                let expected = expected_name.as_str().unwrap_or("");
                let actual = node.annotations.get(i).map(|a| a.name.as_str()).unwrap_or("");
                assert_eq!(actual, expected, "[{}] annotation[{}] name mismatch", id, i);
            }
        }

        // Verify annotation fields round-trip
        for (i, (a1, a2)) in node.annotations.iter().zip(node2.annotations.iter()).enumerate() {
            assert_eq!(a1.name, a2.name, "[{}] annotations[{}].name not preserved", id, i);
            assert_eq!(a1.value, a2.value, "[{}] annotations[{}].value not preserved", id, i);
        }
    }
}

#[test]
fn test_try_catch_conformance() {
    let fixtures = load_fixtures("try-catch.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);
        assert_eq!(node2.body.len(), node.body.len(), "[{}] body length not preserved", id);
        assert_eq!(
            node2.catch_branch.len(),
            node.catch_branch.len(),
            "[{}] catchBranch length not preserved",
            id
        );
        assert_eq!(
            node2.finally_branch.len(),
            node.finally_branch.len(),
            "[{}] finallyBranch length not preserved",
            id
        );

        // Validate expected lengths
        if let Some(expected_catch) = obj.get("expectedCatchLength").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.catch_branch.len(),
                expected_catch as usize,
                "[{}] catchBranch length mismatch",
                id
            );
        }
        if let Some(expected_finally) = obj.get("expectedFinallyLength").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.finally_branch.len(),
                expected_finally as usize,
                "[{}] finallyBranch length mismatch",
                id
            );
        }
        if obj.get("noFinally") == Some(&Value::Bool(true)) {
            assert!(node.finally_branch.is_empty(), "[{}] expected no finallyBranch", id);
            assert!(json_out.get("finallyBranch").is_none(), "[{}] finallyBranch should be absent", id);
        }
        if obj.get("noCatch") == Some(&Value::Bool(true)) {
            assert!(node.catch_branch.is_empty(), "[{}] expected no catchBranch", id);
            assert!(json_out.get("catchBranch").is_none(), "[{}] catchBranch should be absent", id);
        }

        // Annotation count check
        if let Some(ann_count) = obj.get("expectedAnnotationCount").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.annotations.len(),
                ann_count as usize,
                "[{}] annotation count mismatch",
                id
            );
        }
    }
}

#[test]
fn test_async_coordination_conformance() {
    let fixtures = load_fixtures("async-coordination.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);
        assert_eq!(
            node2.async_variant,
            node.async_variant,
            "[{}] asyncVariant not preserved",
            id
        );
        assert_eq!(
            node2.async_body.len(),
            node.async_body.len(),
            "[{}] asyncBody length not preserved",
            id
        );

        // Validate expected asyncVariant
        if let Some(expected_variant) = obj.get("expectedAsyncVariant").and_then(|v| v.as_str()) {
            assert_eq!(
                node.async_variant.as_deref().unwrap_or(""),
                expected_variant,
                "[{}] asyncVariant value mismatch",
                id
            );
        }

        // Validate expected asyncBody length
        if let Some(expected_body_len) = obj.get("expectedAsyncBodyLength").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.async_body.len(),
                expected_body_len as usize,
                "[{}] asyncBody length mismatch",
                id
            );
        }

        // Annotation count check
        if let Some(ann_count) = obj.get("expectedAnnotationCount").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.annotations.len(),
                ann_count as usize,
                "[{}] annotation count mismatch",
                id
            );
        }
    }
}

#[test]
fn test_pipe_conformance() {
    let fixtures = load_fixtures("pipe.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);
        assert_eq!(
            node2.chain_type,
            node.chain_type,
            "[{}] chainType not preserved",
            id
        );
        assert_eq!(
            node2.statements.len(),
            node.statements.len(),
            "[{}] statements length not preserved",
            id
        );

        // Validate expected chainType
        if let Some(expected_chain) = obj.get("expectedChainType").and_then(|v| v.as_str()) {
            assert_eq!(
                node.chain_type.as_deref().unwrap_or(""),
                expected_chain,
                "[{}] chainType value mismatch",
                id
            );
        }

        // Validate not-pipe
        if obj.get("notPipe") == Some(&Value::Bool(true)) {
            assert_ne!(
                node.chain_type.as_deref().unwrap_or(""),
                "pipe",
                "[{}] expected chainType != pipe",
                id
            );
        }

        // Validate statement count
        if let Some(expected_count) = obj.get("expectedStatementCount").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.statements.len(),
                expected_count as usize,
                "[{}] statement count mismatch",
                id
            );
        }

        // Annotation count check
        if let Some(ann_count) = obj.get("expectedAnnotationCount").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.annotations.len(),
                ann_count as usize,
                "[{}] annotation count mismatch",
                id
            );
        }
    }
}

#[test]
fn test_match_conformance() {
    let fixtures = load_fixtures("match.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);
        assert_eq!(node2.arms.len(), node.arms.len(), "[{}] arms length not preserved", id);
        assert_eq!(
            node2.default_arm.len(),
            node.default_arm.len(),
            "[{}] defaultArm length not preserved",
            id
        );

        // Validate expected arm count
        if let Some(expected_arms) = obj.get("expectedArmCount").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.arms.len(),
                expected_arms as usize,
                "[{}] arm count mismatch",
                id
            );
        }

        // Validate expected default arm presence
        if obj.get("expectedDefaultArm") == Some(&Value::Bool(true)) {
            assert!(!node.default_arm.is_empty(), "[{}] expected defaultArm", id);
        }
        if obj.get("noDefaultArm") == Some(&Value::Bool(true)) {
            assert!(node.default_arm.is_empty(), "[{}] expected no defaultArm", id);
            assert!(json_out.get("defaultArm").is_none(), "[{}] defaultArm should be absent", id);
        }

        // Validate arm body length
        if let Some(expected_body_len) = obj.get("expectedArmBodyLength").and_then(|v| v.as_u64()) {
            assert!(!node.arms.is_empty(), "[{}] expected at least one arm", id);
            assert_eq!(
                node.arms[0].body.len(),
                expected_body_len as usize,
                "[{}] arm[0].body length mismatch",
                id
            );
        }

        // Validate arm pattern round-trips
        for (i, (a1, a2)) in node.arms.iter().zip(node2.arms.iter()).enumerate() {
            assert_eq!(
                a1.pattern.value_type,
                a2.pattern.value_type,
                "[{}] arms[{}].pattern.type not preserved",
                id,
                i
            );
            assert_eq!(
                a1.body.len(),
                a2.body.len(),
                "[{}] arms[{}].body length not preserved",
                id,
                i
            );
        }

        // Validate expected pattern type and value
        if let Some(expected_type) = obj.get("expectedArmPatternType").and_then(|v| v.as_str()) {
            assert!(!node.arms.is_empty(), "[{}] expected at least one arm", id);
            assert_eq!(
                node.arms[0].pattern.value_type.to_string(),
                expected_type,
                "[{}] arm[0].pattern type mismatch",
                id
            );
        }
        if let Some(expected_value) = obj.get("expectedArmPatternValue").and_then(|v| v.as_str()) {
            assert!(!node.arms.is_empty(), "[{}] expected at least one arm", id);
            assert_eq!(
                node.arms[0].pattern.string_value(),
                expected_value,
                "[{}] arm[0].pattern value mismatch",
                id
            );
        }
    }
}

#[test]
fn test_version_envelope_conformance() {
    let fixtures = load_fixtures("version-envelope.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

        // Only process JSON-input fixtures (skip streaming fixtures)
        let json_input = match obj.get("jsonInput") {
            Some(ji) => ji,
            None => continue,
        };
        if obj.get("expectedRoundTrip") != Some(&Value::Bool(true)) {
            continue;
        }

        // Test is_envelope
        assert!(is_envelope(json_input), "[{}] is_envelope should return true", id);

        // Test from_envelope_json
        let envelope = from_envelope_json(json_input)
            .unwrap_or_else(|e| panic!("[{}] from_envelope_json failed: {}", id, e));

        // Validate version
        if let Some(expected_version) = obj.get("expectedVersion").and_then(|v| v.as_str()) {
            assert_eq!(
                envelope.lse_version, expected_version,
                "[{}] lseVersion mismatch",
                id
            );
        }

        // Validate features
        if let Some(expected_features) = obj.get("expectedFeatures").and_then(|v| v.as_array()) {
            let expected_strs: Vec<&str> = expected_features
                .iter()
                .filter_map(|f| f.as_str())
                .collect();
            let actual_features = envelope.features.as_deref().unwrap_or(&[]);
            let actual_strs: Vec<&str> = actual_features.iter().map(|s| s.as_str()).collect();
            assert_eq!(actual_strs, expected_strs, "[{}] features mismatch", id);
        }

        // Validate node count
        if let Some(expected_count) = obj.get("expectedNodeCount").and_then(|v| v.as_u64()) {
            assert_eq!(
                envelope.nodes.len(),
                expected_count as usize,
                "[{}] node count mismatch",
                id
            );
        }

        // Test to_envelope_json round-trip
        let json_out = to_envelope_json(&envelope);
        let envelope2 = from_envelope_json(&json_out)
            .unwrap_or_else(|e| panic!("[{}] from_envelope_json (round-trip) failed: {}", id, e));

        assert_eq!(
            envelope2.lse_version, envelope.lse_version,
            "[{}] lseVersion not preserved in round-trip",
            id
        );
        assert_eq!(
            envelope2.nodes.len(),
            envelope.nodes.len(),
            "[{}] node count not preserved in round-trip",
            id
        );
        assert_eq!(
            envelope2.features, envelope.features,
            "[{}] features not preserved in round-trip",
            id
        );
    }
}

#[test]
fn test_expression_values_conformance() {
    let fixtures = load_fixtures("expression-values.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);
        assert_eq!(node2.roles.len(), node.roles.len(), "[{}] roles count not preserved", id);

        // Validate expression raw value is preserved
        if let Some(expected_raw) = obj.get("expectedExpressionRaw").and_then(|v| v.as_str()) {
            // Find the expression role
            let expr_role = node.roles.values().find(|v| v.value_type == ValueType::Expression);
            let actual_raw = expr_role.and_then(|v| v.raw.as_deref()).unwrap_or("");
            assert_eq!(actual_raw, expected_raw, "[{}] expression raw value mismatch", id);

            // Also verify it round-trips
            let expr_role2 = node2.roles.values().find(|v| v.value_type == ValueType::Expression);
            let actual_raw2 = expr_role2.and_then(|v| v.raw.as_deref()).unwrap_or("");
            assert_eq!(actual_raw2, expected_raw, "[{}] expression raw value not preserved in round-trip", id);
        }
    }
}

#[test]
fn test_unicode_values_conformance() {
    let fixtures = load_fixtures("unicode-values.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);

        // Validate selector value preserved
        if let Some(expected_sel) = obj.get("expectedSelectorValue").and_then(|v| v.as_str()) {
            let sel_role = node.roles.values().find(|v| v.value_type == ValueType::Selector);
            let actual = sel_role.and_then(|v| v.value.as_ref()).map(|v| v.as_str()).unwrap_or_default();
            assert_eq!(actual, expected_sel, "[{}] selector value mismatch", id);

            // Round-trip check
            let sel_role2 = node2.roles.values().find(|v| v.value_type == ValueType::Selector);
            let actual2 = sel_role2.and_then(|v| v.value.as_ref()).map(|v| v.as_str()).unwrap_or_default();
            assert_eq!(actual2, expected_sel, "[{}] selector value not preserved in round-trip", id);
        }

        // Validate literal value preserved (e.g. Arabic)
        if let Some(expected_lit) = obj.get("expectedLiteralValue").and_then(|v| v.as_str()) {
            let lit_role = node.roles.values().find(|v| v.value_type == ValueType::Literal);
            let actual = lit_role.and_then(|v| v.value.as_ref()).map(|v| v.as_str()).unwrap_or_default();
            assert_eq!(actual, expected_lit, "[{}] literal value mismatch", id);

            // Round-trip check
            let lit_role2 = node2.roles.values().find(|v| v.value_type == ValueType::Literal);
            let actual2 = lit_role2.and_then(|v| v.value.as_ref()).map(|v| v.as_str()).unwrap_or_default();
            assert_eq!(actual2, expected_lit, "[{}] literal value not preserved in round-trip", id);
        }

        // Validate reference value preserved
        if let Some(expected_ref) = obj.get("expectedReferenceValue").and_then(|v| v.as_str()) {
            let ref_role = node.roles.values().find(|v| v.value_type == ValueType::Reference);
            let actual = ref_role.and_then(|v| v.value.as_ref()).map(|v| v.as_str()).unwrap_or_default();
            assert_eq!(actual, expected_ref, "[{}] reference value mismatch", id);
        }
    }
}

#[test]
fn test_deep_nesting_conformance() {
    let fixtures = load_fixtures("deep-nesting.json");
    for fixture in &fixtures {
        let obj = fixture.as_object().unwrap();
        let id = obj.get("id").and_then(|i| i.as_str()).unwrap_or("unknown");

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

        assert_eq!(node2.action, node.action, "[{}] action not preserved", id);

        // Validate async variant for deep-003
        if let Some(expected_variant) = obj.get("expectedAsyncVariant").and_then(|v| v.as_str()) {
            assert_eq!(
                node.async_variant.as_deref().unwrap_or(""),
                expected_variant,
                "[{}] asyncVariant mismatch",
                id
            );
            assert_eq!(
                node2.async_variant.as_deref().unwrap_or(""),
                expected_variant,
                "[{}] asyncVariant not preserved in round-trip",
                id
            );
        }

        // Validate asyncBody length for deep-003
        if let Some(expected_body_len) = obj.get("expectedAsyncBodyLength").and_then(|v| v.as_u64()) {
            assert_eq!(
                node.async_body.len(),
                expected_body_len as usize,
                "[{}] asyncBody length mismatch",
                id
            );
            assert_eq!(
                node2.async_body.len(),
                expected_body_len as usize,
                "[{}] asyncBody length not preserved in round-trip",
                id
            );
        }

        // For event-handler fixtures: check that body is preserved (depth check)
        if node.kind == NodeKind::EventHandler {
            assert_eq!(
                node2.body.len(),
                node.body.len(),
                "[{}] event-handler body length not preserved",
                id
            );
            // Check nested body nodes are preserved
            for (i, (b1, b2)) in node.body.iter().zip(node2.body.iter()).enumerate() {
                assert_eq!(
                    b1.action, b2.action,
                    "[{}] body[{}].action not preserved",
                    id, i
                );
                // Check try node body is preserved
                assert_eq!(
                    b1.body.len(),
                    b2.body.len(),
                    "[{}] body[{}].body length not preserved",
                    id,
                    i
                );
                assert_eq!(
                    b1.catch_branch.len(),
                    b2.catch_branch.len(),
                    "[{}] body[{}].catchBranch length not preserved",
                    id,
                    i
                );
                assert_eq!(
                    b1.then_branch.len(),
                    b2.then_branch.len(),
                    "[{}] body[{}].thenBranch length not preserved",
                    id,
                    i
                );
                assert_eq!(
                    b1.else_branch.len(),
                    b2.else_branch.len(),
                    "[{}] body[{}].elseBranch length not preserved",
                    id,
                    i
                );
            }
        }
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
