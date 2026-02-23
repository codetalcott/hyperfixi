package lse

import "strings"

// DefaultReferences is the built-in set of recognized reference names.
var DefaultReferences = map[string]bool{
	"me":     true,
	"you":    true,
	"it":     true,
	"result": true,
	"event":  true,
	"target": true,
	"body":   true,
}

// IsValidReference checks if a value is a valid reference name.
// The check is case-insensitive.
func IsValidReference(value string, refs map[string]bool) bool {
	if refs == nil {
		refs = DefaultReferences
	}
	return refs[strings.ToLower(value)]
}
