//! Default reference set for LSE.

use std::collections::HashSet;

/// Returns the default set of valid reference names.
pub fn default_references() -> HashSet<String> {
    ["me", "you", "it", "result", "event", "target", "body"]
        .iter()
        .map(|s| s.to_string())
        .collect()
}

/// Check if a value is a valid reference name (case-insensitive).
pub fn is_valid_reference(value: &str, reference_set: &HashSet<String>) -> bool {
    reference_set.contains(&value.to_lowercase())
}
