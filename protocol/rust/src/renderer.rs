//! LSE Renderer — serializes SemanticNode to bracket syntax.

use crate::types::*;

/// Render a SemanticNode as explicit bracket syntax.
pub fn render_explicit(node: &SemanticNode) -> String {
    // Handle compound nodes
    if node.kind == NodeKind::Compound {
        let rendered: Vec<String> = node.statements.iter().map(render_explicit).collect();
        let chain = node.chain_type.as_deref().unwrap_or("then");
        return rendered.join(&format!(" {} ", chain));
    }

    let mut parts: Vec<String> = vec![node.action.clone()];

    // Add roles
    for (role, value) in &node.roles {
        if value.value_type == ValueType::Flag {
            let prefix = if value.enabled.unwrap_or(true) {
                "+"
            } else {
                "~"
            };
            let name = value.name.as_deref().unwrap_or(role);
            parts.push(format!("{}{}", prefix, name));
        } else {
            parts.push(format!("{}:{}", role, value_to_string(value)));
        }
    }

    // Handle event handler body
    if node.kind == NodeKind::EventHandler && !node.body.is_empty() {
        let body_parts: Vec<String> = node.body.iter().map(render_explicit).collect();
        parts.push(format!("body:{}", body_parts.join(" ")));
    }

    format!("[{}]", parts.join(" "))
}

/// Convert a semantic value to its explicit syntax string form.
fn value_to_string(value: &SemanticValue) -> String {
    match value.value_type {
        ValueType::Literal => {
            if let Some(ref v) = value.value {
                match v {
                    DynValue::String(s) => {
                        let dt = value.data_type.as_deref();
                        if dt == Some("string") || s.contains(char::is_whitespace) {
                            format!("\"{}\"", s)
                        } else {
                            s.clone()
                        }
                    }
                    DynValue::Integer(n) => n.to_string(),
                    DynValue::Float(f) => format!("{}", f),
                    DynValue::Bool(b) => b.to_string(),
                }
            } else {
                String::new()
            }
        }
        ValueType::Selector | ValueType::Reference => {
            if let Some(ref v) = value.value {
                v.as_str()
            } else {
                String::new()
            }
        }
        ValueType::Expression | ValueType::PropertyPath => {
            value.raw.clone().unwrap_or_default()
        }
        ValueType::Flag => value.name.clone().unwrap_or_default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_render_basic_command() {
        let mut roles = HashMap::new();
        roles.insert("patient".to_string(), selector_value(".active"));
        let node = SemanticNode::command("toggle", roles);
        let result = render_explicit(&node);
        assert_eq!(result, "[toggle patient:.active]");
    }

    #[test]
    fn test_render_multiple_roles() {
        let mut roles = HashMap::new();
        roles.insert(
            "patient".to_string(),
            literal_value(DynValue::String("hello".to_string()), "string"),
        );
        roles.insert("destination".to_string(), selector_value("#output"));
        let node = SemanticNode::command("put", roles);
        let result = render_explicit(&node);
        assert!(result.starts_with('[') && result.ends_with(']'));
        assert!(result.contains("patient:\"hello\""));
        assert!(result.contains("destination:#output"));
    }

    #[test]
    fn test_render_reference_value() {
        let mut roles = HashMap::new();
        roles.insert("patient".to_string(), selector_value(".clicked"));
        roles.insert("destination".to_string(), reference_value("me"));
        let node = SemanticNode::command("add", roles);
        let result = render_explicit(&node);
        assert!(result.contains("patient:.clicked"));
        assert!(result.contains("destination:me"));
    }

    #[test]
    fn test_render_numeric_value() {
        let mut roles = HashMap::new();
        roles.insert("destination".to_string(), selector_value("#count"));
        roles.insert(
            "quantity".to_string(),
            literal_value(DynValue::Integer(5), "number"),
        );
        let node = SemanticNode::command("increment", roles);
        let result = render_explicit(&node);
        assert!(result.contains("quantity:5"));
    }

    #[test]
    fn test_render_enabled_flag() {
        let mut roles = HashMap::new();
        roles.insert(
            "name".to_string(),
            literal_value(DynValue::String("id".to_string()), "string"),
        );
        roles.insert("primary-key".to_string(), flag_value("primary-key", true));
        let node = SemanticNode::command("column", roles);
        let result = render_explicit(&node);
        assert!(result.contains("+primary-key"), "got: {}", result);
        assert!(!result.contains("primary-key:"), "got: {}", result);
    }

    #[test]
    fn test_render_disabled_flag() {
        let mut roles = HashMap::new();
        roles.insert(
            "name".to_string(),
            literal_value(DynValue::String("email".to_string()), "string"),
        );
        roles.insert("nullable".to_string(), flag_value("nullable", false));
        let node = SemanticNode::command("field", roles);
        let result = render_explicit(&node);
        assert!(result.contains("~nullable"), "got: {}", result);
    }

    #[test]
    fn test_render_compound_then() {
        let mut roles1 = HashMap::new();
        roles1.insert("patient".to_string(), selector_value(".loading"));
        let mut roles2 = HashMap::new();
        roles2.insert(
            "source".to_string(),
            literal_value(DynValue::String("/api/data".to_string()), "string"),
        );

        let node = SemanticNode::compound(
            vec![
                SemanticNode::command("add", roles1),
                SemanticNode::command("fetch", roles2),
            ],
            "then",
        );
        let result = render_explicit(&node);
        assert!(
            result.contains("[add patient:.loading] then [fetch"),
            "got: {}",
            result
        );
    }

    #[test]
    fn test_render_event_handler_with_body() {
        let mut event_roles = HashMap::new();
        event_roles.insert(
            "event".to_string(),
            literal_value(DynValue::String("click".to_string()), "string"),
        );
        let mut body_roles = HashMap::new();
        body_roles.insert("patient".to_string(), selector_value(".active"));
        let body = vec![SemanticNode::command("toggle", body_roles)];
        let node = SemanticNode::event_handler(event_roles, body);
        let result = render_explicit(&node);
        assert!(result.contains("event:\"click\""), "got: {}", result);
        assert!(
            result.contains("body:[toggle patient:.active]"),
            "got: {}",
            result
        );
    }
}
