//! Core types for LokaScript Explicit Syntax.

use serde::{Deserialize, Serialize, Serializer};
use serde::ser::SerializeMap;
use std::collections::HashMap;
use std::fmt;

/// Value types in the LSE protocol.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ValueType {
    #[serde(rename = "selector")]
    Selector,
    #[serde(rename = "literal")]
    Literal,
    #[serde(rename = "reference")]
    Reference,
    #[serde(rename = "expression")]
    Expression,
    #[serde(rename = "property-path")]
    PropertyPath,
    #[serde(rename = "flag")]
    Flag,
}

impl fmt::Display for ValueType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ValueType::Selector => write!(f, "selector"),
            ValueType::Literal => write!(f, "literal"),
            ValueType::Reference => write!(f, "reference"),
            ValueType::Expression => write!(f, "expression"),
            ValueType::PropertyPath => write!(f, "property-path"),
            ValueType::Flag => write!(f, "flag"),
        }
    }
}

/// Node kinds in the LSE protocol.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeKind {
    #[serde(rename = "command")]
    Command,
    #[serde(rename = "event-handler")]
    EventHandler,
    #[serde(rename = "compound")]
    Compound,
}

impl fmt::Display for NodeKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NodeKind::Command => write!(f, "command"),
            NodeKind::EventHandler => write!(f, "event-handler"),
            NodeKind::Compound => write!(f, "compound"),
        }
    }
}

/// A dynamically-typed value that can be a string, integer, float, or boolean.
#[derive(Debug, Clone, PartialEq)]
pub enum DynValue {
    String(String),
    Integer(i64),
    Float(f64),
    Bool(bool),
}

impl DynValue {
    /// Returns the value as a string representation.
    pub fn as_str(&self) -> String {
        match self {
            DynValue::String(s) => s.clone(),
            DynValue::Integer(n) => n.to_string(),
            DynValue::Float(f) => format!("{}", f),
            DynValue::Bool(b) => b.to_string(),
        }
    }

    /// Returns the value as a serde_json::Value.
    pub fn to_json_value(&self) -> serde_json::Value {
        match self {
            DynValue::String(s) => serde_json::Value::String(s.clone()),
            DynValue::Integer(n) => serde_json::json!(*n),
            DynValue::Float(f) => serde_json::json!(*f),
            DynValue::Bool(b) => serde_json::Value::Bool(*b),
        }
    }

    /// Creates from a serde_json::Value.
    pub fn from_json_value(v: &serde_json::Value) -> Self {
        match v {
            serde_json::Value::String(s) => DynValue::String(s.clone()),
            serde_json::Value::Bool(b) => DynValue::Bool(*b),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    // Check if it's a whole number stored as float
                    if let Some(f) = n.as_f64() {
                        if f == i as f64 {
                            return DynValue::Integer(i);
                        }
                    }
                    DynValue::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    // Check if it's actually a whole number
                    if f == f.trunc() && f.abs() < i64::MAX as f64 {
                        DynValue::Integer(f as i64)
                    } else {
                        DynValue::Float(f)
                    }
                } else {
                    DynValue::String(n.to_string())
                }
            }
            _ => DynValue::String(v.to_string()),
        }
    }
}

impl Serialize for DynValue {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            DynValue::String(s) => serializer.serialize_str(s),
            DynValue::Integer(n) => serializer.serialize_i64(*n),
            DynValue::Float(f) => serializer.serialize_f64(*f),
            DynValue::Bool(b) => serializer.serialize_bool(*b),
        }
    }
}

impl<'de> Deserialize<'de> for DynValue {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let v = serde_json::Value::deserialize(deserializer)?;
        Ok(DynValue::from_json_value(&v))
    }
}

/// A typed value in a role slot.
#[derive(Debug, Clone, PartialEq)]
pub struct SemanticValue {
    pub value_type: ValueType,
    /// The value (for selector, literal, reference types).
    pub value: Option<DynValue>,
    /// Data type hint for literals ("string", "number", "boolean", "duration").
    pub data_type: Option<String>,
    /// Raw expression text (for expression type).
    pub raw: Option<String>,
    /// Flag name (for flag type).
    pub name: Option<String>,
    /// Flag enabled state (for flag type). Required when type is Flag.
    pub enabled: bool,
    /// Optional selector kind hint (for selector type).
    pub selector_kind: Option<String>,
}

impl SemanticValue {
    /// Returns the value as a string.
    pub fn string_value(&self) -> String {
        if let Some(ref v) = self.value {
            v.as_str()
        } else if let Some(ref r) = self.raw {
            r.clone()
        } else if let Some(ref n) = self.name {
            n.clone()
        } else {
            String::new()
        }
    }
}

// Custom Serialize for SemanticValue to match the protocol wire format.
impl Serialize for SemanticValue {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("type", &self.value_type)?;

        match self.value_type {
            ValueType::Selector | ValueType::Reference => {
                if let Some(ref v) = self.value {
                    map.serialize_entry("value", v)?;
                }
                if self.value_type == ValueType::Selector {
                    if let Some(ref sk) = self.selector_kind {
                        map.serialize_entry("selectorKind", sk)?;
                    }
                }
            }
            ValueType::Literal => {
                if let Some(ref v) = self.value {
                    map.serialize_entry("value", v)?;
                }
                if let Some(ref dt) = self.data_type {
                    map.serialize_entry("dataType", dt)?;
                }
            }
            ValueType::Expression | ValueType::PropertyPath => {
                if let Some(ref r) = self.raw {
                    map.serialize_entry("raw", r)?;
                }
            }
            ValueType::Flag => {
                if let Some(ref n) = self.name {
                    map.serialize_entry("name", n)?;
                }
                map.serialize_entry("enabled", &self.enabled)?;
            }
        }
        map.end()
    }
}

/// Factory: create a selector value.
pub fn selector_value(value: &str) -> SemanticValue {
    SemanticValue {
        value_type: ValueType::Selector,
        value: Some(DynValue::String(value.to_string())),
        data_type: None,
        raw: None,
        name: None,
        enabled: false,
        selector_kind: None,
    }
}

/// Factory: create a literal value.
pub fn literal_value(value: DynValue, data_type: &str) -> SemanticValue {
    SemanticValue {
        value_type: ValueType::Literal,
        value: Some(value),
        data_type: Some(data_type.to_string()),
        raw: None,
        name: None,
        enabled: false,
        selector_kind: None,
    }
}

/// Factory: create a reference value.
pub fn reference_value(value: &str) -> SemanticValue {
    SemanticValue {
        value_type: ValueType::Reference,
        value: Some(DynValue::String(value.to_string())),
        data_type: None,
        raw: None,
        name: None,
        enabled: false,
        selector_kind: None,
    }
}

/// Factory: create an expression value.
pub fn expression_value(raw: &str) -> SemanticValue {
    SemanticValue {
        value_type: ValueType::Expression,
        value: None,
        data_type: None,
        raw: Some(raw.to_string()),
        name: None,
        enabled: false,
        selector_kind: None,
    }
}

/// Factory: create a flag value.
pub fn flag_value(name: &str, enabled: bool) -> SemanticValue {
    SemanticValue {
        value_type: ValueType::Flag,
        value: None,
        data_type: None,
        raw: None,
        name: Some(name.to_string()),
        enabled,
        selector_kind: None,
    }
}

/// A metadata annotation on a node (v1.2).
#[derive(Debug, Clone, PartialEq)]
pub struct Annotation {
    pub name: String,
    pub value: Option<String>,
}

impl Serialize for Annotation {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("name", &self.name)?;
        if let Some(ref v) = self.value {
            map.serialize_entry("value", v)?;
        }
        map.end()
    }
}

/// A type-constraint diagnostic on a node (v1.2).
#[derive(Debug, Clone, PartialEq)]
pub struct NodeDiagnostic {
    pub level: String,
    pub role: String,
    pub message: String,
    pub code: String,
}

impl Serialize for NodeDiagnostic {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(4))?;
        map.serialize_entry("level", &self.level)?;
        map.serialize_entry("role", &self.role)?;
        map.serialize_entry("message", &self.message)?;
        map.serialize_entry("code", &self.code)?;
        map.end()
    }
}

/// A single arm in a match command (v1.2).
#[derive(Debug, Clone, PartialEq)]
pub struct MatchArm {
    pub pattern: SemanticValue,
    pub body: Vec<SemanticNode>,
}

impl Serialize for MatchArm {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(2))?;
        map.serialize_entry("pattern", &self.pattern)?;
        map.serialize_entry("body", &self.body)?;
        map.end()
    }
}

/// Versioned wire-format wrapper (v1.2).
#[derive(Debug, Clone, PartialEq)]
pub struct LSEEnvelope {
    pub lse_version: String,
    pub features: Option<Vec<String>>,
    pub nodes: Vec<SemanticNode>,
}

/// A parsed LSE node.
#[derive(Debug, Clone, PartialEq)]
pub struct SemanticNode {
    pub kind: NodeKind,
    pub action: String,
    pub roles: HashMap<String, SemanticValue>,
    pub body: Vec<SemanticNode>,
    pub statements: Vec<SemanticNode>,
    pub chain_type: Option<String>,
    // Conditional fields (v1.1)
    pub then_branch: Vec<SemanticNode>,
    pub else_branch: Vec<SemanticNode>,
    // Loop fields (v1.1)
    pub loop_variant: Option<String>,
    pub loop_body: Vec<SemanticNode>,
    pub loop_variable: Option<String>,
    pub index_variable: Option<String>,
    // v1.2 fields
    pub diagnostics: Vec<NodeDiagnostic>,
    pub annotations: Vec<Annotation>,
    pub catch_branch: Vec<SemanticNode>,
    pub finally_branch: Vec<SemanticNode>,
    pub async_variant: Option<String>,
    pub async_body: Vec<SemanticNode>,
    pub arms: Vec<MatchArm>,
    pub default_arm: Vec<SemanticNode>,
}

impl Default for SemanticNode {
    fn default() -> Self {
        SemanticNode {
            kind: NodeKind::Command,
            action: String::new(),
            roles: HashMap::new(),
            body: Vec::new(),
            statements: Vec::new(),
            chain_type: None,
            then_branch: Vec::new(),
            else_branch: Vec::new(),
            loop_variant: None,
            loop_body: Vec::new(),
            loop_variable: None,
            index_variable: None,
            diagnostics: Vec::new(),
            annotations: Vec::new(),
            catch_branch: Vec::new(),
            finally_branch: Vec::new(),
            async_variant: None,
            async_body: Vec::new(),
            arms: Vec::new(),
            default_arm: Vec::new(),
        }
    }
}

impl SemanticNode {
    /// Create a new command node.
    pub fn command(action: &str, roles: HashMap<String, SemanticValue>) -> Self {
        SemanticNode {
            kind: NodeKind::Command,
            action: action.to_string(),
            roles,
            ..Default::default()
        }
    }

    /// Create a new event handler node.
    pub fn event_handler(
        roles: HashMap<String, SemanticValue>,
        body: Vec<SemanticNode>,
    ) -> Self {
        SemanticNode {
            kind: NodeKind::EventHandler,
            action: "on".to_string(),
            roles,
            body,
            ..Default::default()
        }
    }

    /// Create a new compound node.
    pub fn compound(
        statements: Vec<SemanticNode>,
        chain_type: &str,
    ) -> Self {
        SemanticNode {
            kind: NodeKind::Compound,
            action: "compound".to_string(),
            statements,
            chain_type: Some(chain_type.to_string()),
            ..Default::default()
        }
    }
}

// Custom Serialize to match the protocol wire format.
impl Serialize for SemanticNode {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("kind", &self.kind)?;
        map.serialize_entry("action", &self.action)?;
        map.serialize_entry("roles", &self.roles)?;

        if self.kind == NodeKind::EventHandler && !self.body.is_empty() {
            map.serialize_entry("body", &self.body)?;
        }
        if self.kind == NodeKind::Compound {
            map.serialize_entry("statements", &self.statements)?;
            if let Some(ref ct) = self.chain_type {
                map.serialize_entry("chainType", ct)?;
            }
        }
        // Conditional fields (v1.1)
        if !self.then_branch.is_empty() {
            map.serialize_entry("thenBranch", &self.then_branch)?;
        }
        if !self.else_branch.is_empty() {
            map.serialize_entry("elseBranch", &self.else_branch)?;
        }
        // Loop fields (v1.1)
        if let Some(ref lv) = self.loop_variant {
            map.serialize_entry("loopVariant", lv)?;
        }
        if !self.loop_body.is_empty() {
            map.serialize_entry("loopBody", &self.loop_body)?;
        }
        if let Some(ref lvar) = self.loop_variable {
            map.serialize_entry("loopVariable", lvar)?;
        }
        if let Some(ref ivar) = self.index_variable {
            map.serialize_entry("indexVariable", ivar)?;
        }
        // v1.2 fields
        if !self.diagnostics.is_empty() {
            map.serialize_entry("diagnostics", &self.diagnostics)?;
        }
        if !self.annotations.is_empty() {
            map.serialize_entry("annotations", &self.annotations)?;
        }
        // body for command nodes (try/all/race) — event-handler body is handled above
        if self.kind == NodeKind::Command && !self.body.is_empty() {
            map.serialize_entry("body", &self.body)?;
        }
        if !self.catch_branch.is_empty() {
            map.serialize_entry("catchBranch", &self.catch_branch)?;
        }
        if !self.finally_branch.is_empty() {
            map.serialize_entry("finallyBranch", &self.finally_branch)?;
        }
        if let Some(ref av) = self.async_variant {
            map.serialize_entry("asyncVariant", av)?;
        }
        if !self.async_body.is_empty() {
            map.serialize_entry("asyncBody", &self.async_body)?;
        }
        if !self.arms.is_empty() {
            map.serialize_entry("arms", &self.arms)?;
        }
        if !self.default_arm.is_empty() {
            map.serialize_entry("defaultArm", &self.default_arm)?;
        }
        map.end()
    }
}
