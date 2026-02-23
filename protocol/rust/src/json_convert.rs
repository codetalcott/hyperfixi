//! JSON conversion for LSE — bidirectional SemanticNode <-> JSON.

use std::collections::HashMap;

use serde_json::Value;

use crate::types::*;

/// A diagnostic from JSON validation.
#[derive(Debug, Clone)]
pub struct Diagnostic {
    pub severity: String,
    pub code: String,
    pub message: String,
}

/// Valid value types for JSON validation.
const VALID_VALUE_TYPES: &[&str] = &[
    "selector",
    "literal",
    "reference",
    "expression",
    "property-path",
    "flag",
];

/// Validate a SemanticJSON object. Returns a list of diagnostics (empty = valid).
pub fn validate_json(data: &Value) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();

    let obj = match data.as_object() {
        Some(o) => o,
        None => {
            diagnostics.push(Diagnostic {
                severity: "error".to_string(),
                code: "INVALID_ACTION".to_string(),
                message: "Missing or invalid 'action' field (must be a non-empty string)"
                    .to_string(),
            });
            return diagnostics;
        }
    };

    // Check action
    match obj.get("action").and_then(|a| a.as_str()) {
        Some(s) if !s.is_empty() => {}
        _ => {
            diagnostics.push(Diagnostic {
                severity: "error".to_string(),
                code: "INVALID_ACTION".to_string(),
                message: "Missing or invalid 'action' field (must be a non-empty string)"
                    .to_string(),
            });
        }
    }

    // Check roles
    if let Some(roles) = obj.get("roles").and_then(|r| r.as_object()) {
        for (role_name, role_value) in roles {
            let rv = match role_value.as_object() {
                Some(o) => o,
                None => {
                    diagnostics.push(Diagnostic {
                        severity: "error".to_string(),
                        code: "INVALID_ROLE_VALUE".to_string(),
                        message: format!(
                            "Role \"{}\" must be an object with type and value",
                            role_name
                        ),
                    });
                    continue;
                }
            };

            let vtype = rv.get("type").and_then(|t| t.as_str()).unwrap_or("");
            if !VALID_VALUE_TYPES.contains(&vtype) {
                diagnostics.push(Diagnostic {
                    severity: "error".to_string(),
                    code: "INVALID_VALUE_TYPE".to_string(),
                    message: format!("Role \"{}\" has invalid type \"{}\"", role_name, vtype),
                });
            }

            if !rv.contains_key("value") && vtype != "expression" {
                if !rv.contains_key("raw") {
                    diagnostics.push(Diagnostic {
                        severity: "error".to_string(),
                        code: "MISSING_VALUE".to_string(),
                        message: format!("Role \"{}\" is missing value field", role_name),
                    });
                }
            }
        }
    }

    // Check trigger
    if let Some(trigger) = obj.get("trigger") {
        let event = trigger
            .as_object()
            .and_then(|t| t.get("event"))
            .and_then(|e| e.as_str());
        match event {
            Some(s) if !s.is_empty() => {}
            _ => {
                diagnostics.push(Diagnostic {
                    severity: "error".to_string(),
                    code: "INVALID_TRIGGER".to_string(),
                    message: "Trigger must have a non-empty 'event' string".to_string(),
                });
            }
        }
    }

    diagnostics
}

/// Convert a SemanticJSON Value to a SemanticNode.
///
/// Accepts both full-fidelity and LLM-simplified formats.
pub fn from_json(data: &Value) -> Result<SemanticNode, String> {
    let obj = data
        .as_object()
        .ok_or_else(|| "Expected JSON object".to_string())?;

    let action = obj
        .get("action")
        .and_then(|a| a.as_str())
        .unwrap_or("")
        .to_string();

    let raw_roles = obj
        .get("roles")
        .and_then(|r| r.as_object())
        .cloned()
        .unwrap_or_default();

    let mut roles: HashMap<String, SemanticValue> = HashMap::new();
    for (role_name, role_value) in &raw_roles {
        if role_value.is_object() {
            roles.insert(role_name.clone(), convert_json_value(role_value));
        }
    }

    // If trigger present, wrap in event handler
    if let Some(trigger) = obj.get("trigger").and_then(|t| t.as_object()) {
        let event_name = trigger
            .get("event")
            .and_then(|e| e.as_str())
            .unwrap_or("")
            .to_string();
        let mut event_roles: HashMap<String, SemanticValue> = HashMap::new();
        event_roles.insert(
            "event".to_string(),
            literal_value(DynValue::String(event_name), "string"),
        );
        let body_node = SemanticNode::command(&action, roles);
        return Ok(SemanticNode::event_handler(event_roles, vec![body_node]));
    }

    // Check for full-fidelity format with kind
    let kind = obj
        .get("kind")
        .and_then(|k| k.as_str())
        .unwrap_or("command");

    if kind == "event-handler" {
        let body_data = obj
            .get("body")
            .and_then(|b| b.as_array())
            .cloned()
            .unwrap_or_default();
        let mut body = Vec::new();
        for b in &body_data {
            body.push(from_json(b)?);
        }
        return Ok(SemanticNode {
            kind: NodeKind::EventHandler,
            action,
            roles,
            body,
            statements: Vec::new(),
            chain_type: None,
        });
    }

    if kind == "compound" {
        let stmts_data = obj
            .get("statements")
            .and_then(|s| s.as_array())
            .cloned()
            .unwrap_or_default();
        let mut stmts = Vec::new();
        for s in &stmts_data {
            stmts.push(from_json(s)?);
        }
        let chain_type = obj
            .get("chainType")
            .and_then(|c| c.as_str())
            .unwrap_or("then")
            .to_string();
        return Ok(SemanticNode {
            kind: NodeKind::Compound,
            action,
            roles,
            body: Vec::new(),
            statements: stmts,
            chain_type: Some(chain_type),
        });
    }

    Ok(SemanticNode::command(&action, roles))
}

/// Convert a SemanticNode to a full-fidelity JSON Value.
pub fn to_json(node: &SemanticNode) -> Value {
    serde_json::to_value(node).unwrap_or(Value::Null)
}

/// Convert a JSON value object to a SemanticValue.
fn convert_json_value(data: &Value) -> SemanticValue {
    let obj = match data.as_object() {
        Some(o) => o,
        None => return literal_value(DynValue::String(String::new()), "string"),
    };

    let vtype = obj
        .get("type")
        .and_then(|t| t.as_str())
        .unwrap_or("literal");
    let raw_value = obj.get("value").or_else(|| obj.get("raw"));

    match vtype {
        "selector" => {
            let v = raw_value
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            selector_value(&v)
        }
        "literal" => {
            if let Some(val) = raw_value {
                if val.is_boolean() {
                    literal_value(DynValue::Bool(val.as_bool().unwrap()), "boolean")
                } else if val.is_number() {
                    let dv = DynValue::from_json_value(val);
                    literal_value(dv, "number")
                } else {
                    let data_type = obj
                        .get("dataType")
                        .and_then(|dt| dt.as_str())
                        .unwrap_or("string");
                    let s = val.as_str().unwrap_or("").to_string();
                    literal_value(DynValue::String(s), data_type)
                }
            } else {
                literal_value(DynValue::String(String::new()), "string")
            }
        }
        "reference" => {
            let v = raw_value
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            reference_value(&v)
        }
        "expression" => {
            let r = obj
                .get("raw")
                .or(raw_value)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            expression_value(&r)
        }
        "flag" => {
            let name = obj
                .get("name")
                .and_then(|n| n.as_str())
                .or_else(|| raw_value.and_then(|v| v.as_str()))
                .unwrap_or("")
                .to_string();
            let enabled = obj
                .get("enabled")
                .and_then(|e| e.as_bool())
                .or_else(|| raw_value.and_then(|v| v.as_bool()))
                .unwrap_or(true);
            flag_value(&name, enabled)
        }
        "property-path" => {
            let r = raw_value
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            expression_value(&r)
        }
        _ => {
            let s = raw_value
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            literal_value(DynValue::String(s), "string")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_validate_json_valid() {
        let data = json!({
            "action": "toggle",
            "roles": {
                "patient": {"type": "selector", "value": ".active"}
            }
        });
        let diags = validate_json(&data);
        assert!(diags.is_empty(), "got: {:?}", diags);
    }

    #[test]
    fn test_validate_json_missing_action() {
        let data = json!({"roles": {}});
        let diags = validate_json(&data);
        assert_eq!(diags.len(), 1);
        assert_eq!(diags[0].code, "INVALID_ACTION");
    }

    #[test]
    fn test_validate_json_invalid_role_value() {
        let data = json!({
            "action": "toggle",
            "roles": {"patient": "not-an-object"}
        });
        let diags = validate_json(&data);
        assert!(diags.iter().any(|d| d.code == "INVALID_ROLE_VALUE"));
    }

    #[test]
    fn test_validate_json_invalid_value_type() {
        let data = json!({
            "action": "toggle",
            "roles": {"patient": {"type": "unknown", "value": ".active"}}
        });
        let diags = validate_json(&data);
        assert!(diags.iter().any(|d| d.code == "INVALID_VALUE_TYPE"));
    }

    #[test]
    fn test_validate_json_missing_value() {
        let data = json!({
            "action": "toggle",
            "roles": {"patient": {"type": "selector"}}
        });
        let diags = validate_json(&data);
        assert!(diags.iter().any(|d| d.code == "MISSING_VALUE"));
    }

    #[test]
    fn test_validate_json_valid_trigger() {
        let data = json!({
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
            "trigger": {"event": "click"}
        });
        let diags = validate_json(&data);
        assert!(diags.is_empty(), "got: {:?}", diags);
    }

    #[test]
    fn test_validate_json_invalid_trigger() {
        let data = json!({
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
            "trigger": {"event": ""}
        });
        let diags = validate_json(&data);
        assert!(diags.iter().any(|d| d.code == "INVALID_TRIGGER"));
    }

    #[test]
    fn test_validate_json_flag_type() {
        let data = json!({
            "action": "column",
            "roles": {"primary-key": {"type": "flag", "value": true}}
        });
        let diags = validate_json(&data);
        assert!(diags.is_empty(), "got: {:?}", diags);
    }

    #[test]
    fn test_from_json_basic_command() {
        let data = json!({
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}}
        });
        let node = from_json(&data).unwrap();
        assert_eq!(node.kind, NodeKind::Command);
        assert_eq!(node.action, "toggle");
        assert_eq!(node.roles["patient"].value_type, ValueType::Selector);
    }

    #[test]
    fn test_from_json_trigger_wraps_event_handler() {
        let data = json!({
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
            "trigger": {"event": "click"}
        });
        let node = from_json(&data).unwrap();
        assert_eq!(node.kind, NodeKind::EventHandler);
        assert_eq!(node.action, "on");
        assert_eq!(node.body.len(), 1);
        assert_eq!(node.body[0].action, "toggle");
    }

    #[test]
    fn test_from_json_full_fidelity_event_handler() {
        let data = json!({
            "kind": "event-handler",
            "action": "on",
            "roles": {
                "event": {"type": "literal", "value": "click", "dataType": "string"}
            },
            "body": [{
                "kind": "command",
                "action": "toggle",
                "roles": {
                    "patient": {"type": "selector", "value": ".active"}
                }
            }]
        });
        let node = from_json(&data).unwrap();
        assert_eq!(node.kind, NodeKind::EventHandler);
        assert_eq!(node.body.len(), 1);
    }

    #[test]
    fn test_from_json_compound_node() {
        let data = json!({
            "kind": "compound",
            "action": "compound",
            "chainType": "then",
            "statements": [
                {
                    "kind": "command",
                    "action": "add",
                    "roles": {"patient": {"type": "selector", "value": ".loading"}}
                },
                {
                    "kind": "command",
                    "action": "fetch",
                    "roles": {"source": {"type": "literal", "value": "/api/data", "dataType": "string"}}
                }
            ]
        });
        let node = from_json(&data).unwrap();
        assert_eq!(node.kind, NodeKind::Compound);
        assert_eq!(node.chain_type.as_deref(), Some("then"));
        assert_eq!(node.statements.len(), 2);
    }

    #[test]
    fn test_to_json_basic_command() {
        let mut roles = HashMap::new();
        roles.insert("patient".to_string(), selector_value(".active"));
        let node = SemanticNode::command("toggle", roles);
        let result = to_json(&node);
        assert_eq!(result["action"], "toggle");
        assert_eq!(result["roles"]["patient"]["type"], "selector");
        assert_eq!(result["roles"]["patient"]["value"], ".active");
    }

    #[test]
    fn test_to_json_flag() {
        let mut roles = HashMap::new();
        roles.insert(
            "name".to_string(),
            literal_value(DynValue::String("id".to_string()), "string"),
        );
        roles.insert("primary-key".to_string(), flag_value("primary-key", true));
        let node = SemanticNode::command("column", roles);
        let result = to_json(&node);
        let pk = &result["roles"]["primary-key"];
        assert_eq!(pk["type"], "flag");
        assert_eq!(pk["name"], "primary-key");
        assert_eq!(pk["enabled"], true);
    }

    #[test]
    fn test_round_trip_json() {
        let original = json!({
            "action": "toggle",
            "roles": {
                "patient": {"type": "selector", "value": ".active"},
                "destination": {"type": "selector", "value": "#button"}
            }
        });
        let node = from_json(&original).unwrap();
        let result = to_json(&node);
        assert_eq!(result["action"], "toggle");
        assert_eq!(result["roles"]["patient"]["type"], "selector");
        assert_eq!(result["roles"]["patient"]["value"], ".active");
    }
}
