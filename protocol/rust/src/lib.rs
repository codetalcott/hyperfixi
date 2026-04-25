//! LokaScript Explicit Syntax (LSE) protocol.
//!
//! A language-agnostic, role-labeled intermediate representation for imperative
//! commands: `[command role:value +flag ...]`
//!
//! # Examples
//!
//! ```
//! use lokascript_explicit::*;
//!
//! // Parse bracket syntax
//! let node = parse_explicit("[toggle patient:.active]", None).unwrap();
//! assert_eq!(node.action, "toggle");
//!
//! // Render back to bracket syntax
//! let rendered = render_explicit(&node);
//! assert_eq!(rendered, "[toggle patient:.active]");
//!
//! // Convert to/from JSON
//! let json = to_json(&node);
//! let restored = from_json(&json).unwrap();
//! assert_eq!(restored.action, "toggle");
//! ```

pub mod json_convert;
pub mod parser;
pub mod references;
pub mod renderer;
pub mod types;

// Re-export public API
pub use json_convert::{
    from_json, to_json, validate_json, Diagnostic,
    is_envelope, from_envelope_json, to_envelope_json,
};
pub use parser::{is_explicit_syntax, parse_explicit, ParseError, ParseOptions};
pub use references::{default_references, is_valid_reference};
pub use renderer::render_explicit;
pub use types::*;
