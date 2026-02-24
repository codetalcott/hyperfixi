//! LSE Parser — parses [command role:value +flag ...] bracket syntax.

use std::collections::{HashMap, HashSet};

use crate::references::default_references;
use crate::types::*;

/// Error type for parse failures.
#[derive(Debug, Clone)]
pub struct ParseError {
    pub message: String,
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ParseError {}

/// Options for parsing.
pub struct ParseOptions {
    /// Custom reference set. If None, uses default references.
    pub reference_set: Option<HashSet<String>>,
    /// Maximum input length in bytes. If set, inputs exceeding this
    /// length will be rejected with a ParseError. Recommended for
    /// server-side use to prevent resource exhaustion.
    pub max_input_length: Option<usize>,
}

/// Check if input is explicit bracket syntax.
pub fn is_explicit_syntax(text: &str) -> bool {
    let trimmed = text.trim();
    trimmed.starts_with('[') && trimmed.ends_with(']')
}

/// Parse explicit bracket syntax into a SemanticNode.
pub fn parse_explicit(
    text: &str,
    opts: Option<&ParseOptions>,
) -> Result<SemanticNode, ParseError> {
    // Check input length limit
    if let Some(max_len) = opts.and_then(|o| o.max_input_length) {
        if text.len() > max_len {
            return Err(ParseError {
                message: format!(
                    "Input length {} exceeds maximum allowed length {}",
                    text.len(),
                    max_len
                ),
            });
        }
    }

    let refs = match opts.and_then(|o| o.reference_set.as_ref()) {
        Some(r) => r.clone(),
        None => default_references(),
    };

    let trimmed = text.trim();

    if !trimmed.starts_with('[') || !trimmed.ends_with(']') {
        return Err(ParseError {
            message: "Explicit syntax must be wrapped in brackets: [command role:value ...]"
                .to_string(),
        });
    }

    let content = trimmed[1..trimmed.len() - 1].trim();
    if content.is_empty() {
        return Err(ParseError {
            message: "Empty explicit statement".to_string(),
        });
    }

    let tokens = tokenize(content);
    if tokens.is_empty() {
        return Err(ParseError {
            message: "No command specified in explicit statement".to_string(),
        });
    }

    let command = tokens[0].to_lowercase();
    let mut roles: HashMap<String, SemanticValue> = HashMap::new();

    for token in &tokens[1..] {
        // Boolean flag: +name or ~name
        if token.starts_with('+') || token.starts_with('~') {
            let enabled = token.starts_with('+');
            let flag_name = &token[1..];
            if flag_name.is_empty() {
                return Err(ParseError {
                    message: format!("Empty flag name: \"{}\"", token),
                });
            }
            roles.insert(flag_name.to_string(), flag_value(flag_name, enabled));
            continue;
        }

        // Role:value pair
        let colon_idx = match token.find(':') {
            Some(idx) => idx,
            None => {
                return Err(ParseError {
                    message: format!(
                        "Invalid role format: \"{}\". Expected role:value or +flag",
                        token
                    ),
                });
            }
        };

        let role_name = &token[..colon_idx];
        let value_str = &token[colon_idx + 1..];

        // Handle nested explicit syntax for body
        if role_name == "body" && value_str.starts_with('[') {
            let nested_end = find_matching_bracket(token, colon_idx + 1);
            let nested_syntax = &token[colon_idx + 1..=nested_end];
            roles.insert(
                role_name.to_string(),
                expression_value(nested_syntax),
            );
            continue;
        }

        let value = parse_value(value_str, &refs);
        roles.insert(role_name.to_string(), value);
    }

    // Build appropriate node type
    if command == "on" {
        if !roles.contains_key("event") {
            return Err(ParseError {
                message: "Event handler requires event role: [on event:click ...]".to_string(),
            });
        }

        // Parse body if present
        let mut body: Vec<SemanticNode> = Vec::new();
        if let Some(body_val) = roles.get("body") {
            if body_val.value_type == ValueType::Expression {
                if let Some(ref raw) = body_val.raw {
                    let parsed = parse_explicit(raw, opts)?;
                    body.push(parsed);
                }
            }
        }

        // Remove body from roles (structural, not semantic)
        roles.remove("body");

        return Ok(SemanticNode::event_handler(roles, body));
    }

    Ok(SemanticNode::command(&command, roles))
}

/// Count consecutive backslashes immediately before position `pos` in a char slice.
fn count_preceding_backslashes(chars: &[char], pos: usize) -> usize {
    let mut count = 0;
    let mut j = pos;
    while j > 0 {
        j -= 1;
        if chars[j] == '\\' {
            count += 1;
        } else {
            break;
        }
    }
    count
}

/// Tokenize explicit syntax content.
///
/// Splits on spaces, but respects quoted strings and bracket nesting.
fn tokenize(content: &str) -> Vec<String> {
    let mut tokens: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_string = false;
    let mut string_char = '\0';
    let mut bracket_depth = 0;

    let chars: Vec<char> = content.chars().collect();

    for i in 0..chars.len() {
        let ch = chars[i];

        if in_string {
            current.push(ch);
            // A quote closes the string only if preceded by an even number of backslashes
            if ch == string_char && count_preceding_backslashes(&chars, i) % 2 == 0 {
                in_string = false;
            }
            continue;
        }

        if ch == '"' || ch == '\'' {
            in_string = true;
            string_char = ch;
            current.push(ch);
            continue;
        }

        if ch == '[' {
            bracket_depth += 1;
            current.push(ch);
            continue;
        }

        if ch == ']' {
            bracket_depth -= 1;
            current.push(ch);
            continue;
        }

        if ch == ' ' && bracket_depth == 0 {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            continue;
        }

        current.push(ch);
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

/// Parse a value string into a SemanticValue.
///
/// Detection priority:
/// 1. Selector (#, ., [, @, *)
/// 2. String literal ("..." or '...')
/// 3. Boolean (true/false)
/// 4. Reference (me, you, it, ...)
/// 5. Duration (500ms, 2s, ...)
/// 6. Number (42, 3.14, ...)
/// 7. Plain value (fallback -> string literal)
fn parse_value(value_str: &str, refs: &HashSet<String>) -> SemanticValue {
    if value_str.is_empty() {
        return literal_value(DynValue::String(String::new()), "string");
    }

    let first_char = value_str.chars().next().unwrap();

    // 1. CSS selector
    if matches!(first_char, '#' | '.' | '[' | '@' | '*') {
        return selector_value(value_str);
    }

    // 2. String literal
    if first_char == '"' || first_char == '\'' {
        let inner = &value_str[1..value_str.len() - 1];
        return literal_value(DynValue::String(inner.to_string()), "string");
    }

    // 3. Boolean
    if value_str == "true" {
        return literal_value(DynValue::Bool(true), "boolean");
    }
    if value_str == "false" {
        return literal_value(DynValue::Bool(false), "boolean");
    }

    // 4. Reference (case-insensitive)
    let lower = value_str.to_lowercase();
    if refs.contains(&lower) {
        return reference_value(&lower);
    }

    // 5. Duration
    if let Some(cap) = parse_duration(value_str) {
        return literal_value(DynValue::String(cap), "duration");
    }

    // 6. Number
    if let Some(num) = parse_number(value_str) {
        return literal_value(num, "number");
    }

    // 7. Fallback: plain string
    literal_value(DynValue::String(value_str.to_string()), "string")
}

/// Try to parse a duration string (e.g., "500ms", "2s", "1.5h").
fn parse_duration(s: &str) -> Option<String> {
    // Match pattern: optional negative, digits, optional decimal, suffix
    let suffixes = ["ms", "s", "m", "h"];
    for suffix in &suffixes {
        if s.ends_with(suffix) {
            let num_part = &s[..s.len() - suffix.len()];
            if parse_number_str(num_part).is_some() {
                return Some(s.to_string());
            }
        }
    }
    None
}

/// Try to parse a number string, returning a DynValue.
fn parse_number(s: &str) -> Option<DynValue> {
    parse_number_str(s).map(|f| {
        if f == f.trunc() && f.abs() < i64::MAX as f64 {
            DynValue::Integer(f as i64)
        } else {
            DynValue::Float(f)
        }
    })
}

/// Try to parse a number string, returning f64.
fn parse_number_str(s: &str) -> Option<f64> {
    // Must match: optional negative, digits, optional decimal
    if s.is_empty() {
        return None;
    }
    let start = if s.starts_with('-') { 1 } else { 0 };
    let rest = &s[start..];
    if rest.is_empty() {
        return None;
    }
    // Must be all digits with at most one decimal point
    let mut has_dot = false;
    for (i, ch) in rest.chars().enumerate() {
        if ch == '.' {
            if has_dot || i == 0 || i == rest.len() - 1 {
                return None;
            }
            has_dot = true;
        } else if !ch.is_ascii_digit() {
            return None;
        }
    }
    s.parse::<f64>().ok()
}

/// Find the matching closing bracket starting from byte position `start`.
///
/// Uses byte iteration since `[` and `]` are ASCII (single-byte in UTF-8)
/// and won't appear as continuation bytes in multi-byte sequences.
fn find_matching_bracket(s: &str, start: usize) -> usize {
    let bytes = s.as_bytes();
    let mut depth = 0;
    for i in start..bytes.len() {
        if bytes[i] == b'[' {
            depth += 1;
        } else if bytes[i] == b']' {
            depth -= 1;
            if depth == 0 {
                return i;
            }
        }
    }
    s.len() - 1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_explicit_syntax() {
        assert!(is_explicit_syntax("[toggle patient:.active]"));
        assert!(is_explicit_syntax("  [toggle patient:.active]  "));
        assert!(!is_explicit_syntax("toggle .active"));
        assert!(!is_explicit_syntax("[incomplete"));
        assert!(!is_explicit_syntax("incomplete]"));
        assert!(!is_explicit_syntax(""));
    }

    #[test]
    fn test_parse_basic_command() {
        let node = parse_explicit("[toggle patient:.active destination:#button]", None).unwrap();
        assert_eq!(node.kind, NodeKind::Command);
        assert_eq!(node.action, "toggle");
        let patient = &node.roles["patient"];
        assert_eq!(patient.value_type, ValueType::Selector);
        assert_eq!(patient.string_value(), ".active");
        let dest = &node.roles["destination"];
        assert_eq!(dest.value_type, ValueType::Selector);
        assert_eq!(dest.string_value(), "#button");
    }

    #[test]
    fn test_parse_command_name_lowercased() {
        let node = parse_explicit("[Toggle patient:.active]", None).unwrap();
        assert_eq!(node.action, "toggle");
    }

    #[test]
    fn test_parse_selector_values() {
        let node = parse_explicit("[add patient:.highlight destination:#output]", None).unwrap();
        assert_eq!(node.roles["patient"].value_type, ValueType::Selector);
        assert_eq!(node.roles["patient"].string_value(), ".highlight");
    }

    #[test]
    fn test_parse_string_literal() {
        let node =
            parse_explicit(r#"[put patient:"hello world" destination:#output]"#, None).unwrap();
        let patient = &node.roles["patient"];
        assert_eq!(patient.value_type, ValueType::Literal);
        assert_eq!(patient.string_value(), "hello world");
        assert_eq!(patient.data_type.as_deref(), Some("string"));
    }

    #[test]
    fn test_parse_boolean_true() {
        let node = parse_explicit("[set destination:myVar goal:true]", None).unwrap();
        let goal = &node.roles["goal"];
        assert_eq!(goal.value_type, ValueType::Literal);
        assert_eq!(goal.value, Some(DynValue::Bool(true)));
        assert_eq!(goal.data_type.as_deref(), Some("boolean"));
    }

    #[test]
    fn test_parse_boolean_false() {
        let node = parse_explicit("[set destination:myVar goal:false]", None).unwrap();
        let goal = &node.roles["goal"];
        assert_eq!(goal.value_type, ValueType::Literal);
        assert_eq!(goal.value, Some(DynValue::Bool(false)));
        assert_eq!(goal.data_type.as_deref(), Some("boolean"));
    }

    #[test]
    fn test_parse_numeric_integer() {
        let node = parse_explicit("[increment destination:count quantity:5]", None).unwrap();
        let qty = &node.roles["quantity"];
        assert_eq!(qty.value_type, ValueType::Literal);
        assert_eq!(qty.value, Some(DynValue::Integer(5)));
        assert_eq!(qty.data_type.as_deref(), Some("number"));
    }

    #[test]
    fn test_parse_numeric_decimal() {
        let node = parse_explicit("[set destination:ratio goal:3.14]", None).unwrap();
        let goal = &node.roles["goal"];
        assert_eq!(goal.value_type, ValueType::Literal);
        assert_eq!(goal.value, Some(DynValue::Float(3.14)));
        assert_eq!(goal.data_type.as_deref(), Some("number"));
    }

    #[test]
    fn test_parse_duration_ms() {
        let node = parse_explicit("[wait duration:500ms]", None).unwrap();
        let dur = &node.roles["duration"];
        assert_eq!(dur.value_type, ValueType::Literal);
        assert_eq!(dur.string_value(), "500ms");
        assert_eq!(dur.data_type.as_deref(), Some("duration"));
    }

    #[test]
    fn test_parse_duration_s() {
        let node = parse_explicit("[wait duration:2s]", None).unwrap();
        let dur = &node.roles["duration"];
        assert_eq!(dur.value_type, ValueType::Literal);
        assert_eq!(dur.string_value(), "2s");
        assert_eq!(dur.data_type.as_deref(), Some("duration"));
    }

    #[test]
    fn test_parse_reference_me() {
        let node = parse_explicit("[add patient:.active destination:me]", None).unwrap();
        let dest = &node.roles["destination"];
        assert_eq!(dest.value_type, ValueType::Reference);
        assert_eq!(dest.string_value(), "me");
    }

    #[test]
    fn test_parse_reference_case_insensitive() {
        let node = parse_explicit("[add patient:.active destination:Me]", None).unwrap();
        let dest = &node.roles["destination"];
        assert_eq!(dest.value_type, ValueType::Reference);
        assert_eq!(dest.string_value(), "me");
    }

    #[test]
    fn test_parse_plain_string_fallback() {
        let node = parse_explicit("[fetch source:/api/users responseType:json]", None).unwrap();
        let src = &node.roles["source"];
        assert_eq!(src.value_type, ValueType::Literal);
        assert_eq!(src.string_value(), "/api/users");
        assert_eq!(src.data_type.as_deref(), Some("string"));
        let rt = &node.roles["responseType"];
        assert_eq!(rt.value_type, ValueType::Literal);
        assert_eq!(rt.string_value(), "json");
    }

    #[test]
    fn test_parse_event_handler() {
        let node =
            parse_explicit("[on event:click body:[toggle patient:.active]]", None).unwrap();
        assert_eq!(node.kind, NodeKind::EventHandler);
        assert_eq!(node.action, "on");
        assert_eq!(node.body.len(), 1);
        assert_eq!(node.body[0].kind, NodeKind::Command);
        assert_eq!(node.body[0].action, "toggle");
    }

    #[test]
    fn test_parse_enabled_flag() {
        let node = parse_explicit("[column name:id +primary-key]", None).unwrap();
        let pk = &node.roles["primary-key"];
        assert_eq!(pk.value_type, ValueType::Flag);
        assert_eq!(pk.name.as_deref(), Some("primary-key"));
        assert_eq!(pk.enabled, Some(true));
    }

    #[test]
    fn test_parse_disabled_flag() {
        let node = parse_explicit("[field name:email ~nullable]", None).unwrap();
        let n = &node.roles["nullable"];
        assert_eq!(n.value_type, ValueType::Flag);
        assert_eq!(n.name.as_deref(), Some("nullable"));
        assert_eq!(n.enabled, Some(false));
    }

    #[test]
    fn test_parse_multiple_flags() {
        let node =
            parse_explicit("[column name:id type:uuid +primary-key +not-null]", None).unwrap();
        assert_eq!(node.roles["primary-key"].enabled, Some(true));
        assert_eq!(node.roles["not-null"].enabled, Some(true));
    }

    #[test]
    fn test_parse_mixed_flags() {
        let node = parse_explicit("[field name:email +required ~nullable]", None).unwrap();
        assert_eq!(node.roles["required"].enabled, Some(true));
        assert_eq!(node.roles["nullable"].enabled, Some(false));
    }

    #[test]
    fn test_parse_flags_only() {
        let node = parse_explicit("[widget +draggable +resizable]", None).unwrap();
        assert_eq!(node.roles["draggable"].enabled, Some(true));
        assert_eq!(node.roles["resizable"].enabled, Some(true));
    }

    // Error cases

    #[test]
    fn test_parse_error_missing_brackets() {
        let err = parse_explicit("toggle patient:.active", None).unwrap_err();
        assert!(
            err.message.to_lowercase().contains("brackets"),
            "error: {}",
            err.message
        );
    }

    #[test]
    fn test_parse_error_empty_brackets() {
        let err = parse_explicit("[]", None).unwrap_err();
        assert!(err.message.contains("Empty"), "error: {}", err.message);
    }

    #[test]
    fn test_parse_error_whitespace_brackets() {
        let err = parse_explicit("[  ]", None).unwrap_err();
        assert!(err.message.contains("Empty"), "error: {}", err.message);
    }

    #[test]
    fn test_parse_error_missing_colon() {
        let err = parse_explicit("[toggle active]", None).unwrap_err();
        assert!(
            err.message.contains("role:value"),
            "error: {}",
            err.message
        );
    }

    #[test]
    fn test_parse_error_missing_event_role() {
        let err = parse_explicit("[on body:[toggle patient:.active]]", None).unwrap_err();
        assert!(
            err.message.to_lowercase().contains("event"),
            "error: {}",
            err.message
        );
    }

    #[test]
    fn test_parse_error_empty_flag_plus() {
        let err = parse_explicit("[column name:id +]", None).unwrap_err();
        assert!(
            err.message.contains("Empty flag"),
            "error: {}",
            err.message
        );
    }

    #[test]
    fn test_parse_error_empty_flag_tilde() {
        let err = parse_explicit("[column name:id ~]", None).unwrap_err();
        assert!(
            err.message.contains("Empty flag"),
            "error: {}",
            err.message
        );
    }

    #[test]
    fn test_custom_reference_set() {
        let mut refs = HashSet::new();
        refs.insert("self".to_string());
        refs.insert("parent".to_string());
        let opts = ParseOptions {
            reference_set: Some(refs),
            max_input_length: None,
        };
        let node =
            parse_explicit("[add patient:.active destination:self]", Some(&opts)).unwrap();
        let dest = &node.roles["destination"];
        assert_eq!(dest.value_type, ValueType::Reference);
        assert_eq!(dest.string_value(), "self");
    }

    #[test]
    fn test_custom_reference_set_excludes_defaults() {
        let mut refs = HashSet::new();
        refs.insert("self".to_string());
        let opts = ParseOptions {
            reference_set: Some(refs),
            max_input_length: None,
        };
        let node =
            parse_explicit("[add patient:.active destination:me]", Some(&opts)).unwrap();
        // 'me' is NOT in custom set, so it becomes a string literal
        let dest = &node.roles["destination"];
        assert_eq!(dest.value_type, ValueType::Literal);
        assert_eq!(dest.string_value(), "me");
        assert_eq!(dest.data_type.as_deref(), Some("string"));
    }
}
