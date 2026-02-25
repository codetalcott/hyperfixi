// Package lse implements the LokaScript Explicit Syntax (LSE) protocol.
//
// LSE is a language-agnostic, role-labeled intermediate representation for
// imperative commands: [command role:value +flag ...]
package lse

import (
	"encoding/json"
	"fmt"
)

// ValueType enumerates the discriminated union of semantic value types.
type ValueType string

const (
	TypeSelector     ValueType = "selector"
	TypeLiteral      ValueType = "literal"
	TypeReference    ValueType = "reference"
	TypeExpression   ValueType = "expression"
	TypePropertyPath ValueType = "property-path"
	TypeFlag         ValueType = "flag"
)

// NodeKind enumerates the kinds of semantic nodes.
type NodeKind string

const (
	KindCommand      NodeKind = "command"
	KindEventHandler NodeKind = "event-handler"
	KindCompound     NodeKind = "compound"
)

// SemanticValue represents a typed value in a role slot.
type SemanticValue struct {
	Type         ValueType `json:"type"`
	Value        any       `json:"value,omitempty"`
	DataType     string    `json:"dataType,omitempty"`
	Raw          string    `json:"raw,omitempty"`
	Name         string    `json:"name,omitempty"`
	Enabled      bool      `json:"enabled"`
	SelectorKind string    `json:"selectorKind,omitempty"`
}

// SelectorValue creates a selector SemanticValue.
func SelectorValue(value string) SemanticValue {
	return SemanticValue{Type: TypeSelector, Value: value}
}

// LiteralValue creates a literal SemanticValue.
func LiteralValue(value any, dataType string) SemanticValue {
	return SemanticValue{Type: TypeLiteral, Value: value, DataType: dataType}
}

// ReferenceValue creates a reference SemanticValue.
func ReferenceValue(value string) SemanticValue {
	return SemanticValue{Type: TypeReference, Value: value}
}

// ExpressionValue creates an expression SemanticValue.
func ExpressionValue(raw string) SemanticValue {
	return SemanticValue{Type: TypeExpression, Raw: raw}
}

// FlagValue creates a flag SemanticValue.
func FlagValue(name string, enabled bool) SemanticValue {
	return SemanticValue{Type: TypeFlag, Name: name, Enabled: enabled}
}

// StringValue returns the Value field as a string, or empty string.
func (v SemanticValue) StringValue() string {
	if v.Value == nil {
		return ""
	}
	switch val := v.Value.(type) {
	case string:
		return val
	default:
		return fmt.Sprintf("%v", val)
	}
}

// SemanticNode represents a parsed LSE node.
type SemanticNode struct {
	Kind       NodeKind                 `json:"kind"`
	Action     string                   `json:"action"`
	Roles      map[string]SemanticValue `json:"roles"`
	Body       []SemanticNode           `json:"body,omitempty"`
	Statements []SemanticNode           `json:"statements,omitempty"`
	ChainType  string                   `json:"chainType,omitempty"`
	// Conditional fields (v1.1)
	ThenBranch []SemanticNode `json:"thenBranch,omitempty"`
	ElseBranch []SemanticNode `json:"elseBranch,omitempty"`
	// Loop fields (v1.1)
	LoopVariant   string         `json:"loopVariant,omitempty"`
	LoopBody      []SemanticNode `json:"loopBody,omitempty"`
	LoopVariable  string         `json:"loopVariable,omitempty"`
	IndexVariable string         `json:"indexVariable,omitempty"`
}

// MarshalJSON implements custom JSON marshaling to match the protocol wire format.
func (n SemanticNode) MarshalJSON() ([]byte, error) {
	m := map[string]any{
		"kind":   string(n.Kind),
		"action": n.Action,
		"roles":  marshalRoles(n.Roles),
	}
	if n.Kind == KindEventHandler && len(n.Body) > 0 {
		m["body"] = n.Body
	}
	if n.Kind == KindCompound {
		m["statements"] = n.Statements
		if n.ChainType != "" {
			m["chainType"] = n.ChainType
		}
	}
	// Conditional fields (v1.1)
	if len(n.ThenBranch) > 0 {
		m["thenBranch"] = n.ThenBranch
	}
	if len(n.ElseBranch) > 0 {
		m["elseBranch"] = n.ElseBranch
	}
	// Loop fields (v1.1)
	if n.LoopVariant != "" {
		m["loopVariant"] = n.LoopVariant
	}
	if len(n.LoopBody) > 0 {
		m["loopBody"] = n.LoopBody
	}
	if n.LoopVariable != "" {
		m["loopVariable"] = n.LoopVariable
	}
	if n.IndexVariable != "" {
		m["indexVariable"] = n.IndexVariable
	}
	return json.Marshal(m)
}

// marshalRoles converts roles map to JSON-friendly format.
func marshalRoles(roles map[string]SemanticValue) map[string]any {
	result := make(map[string]any, len(roles))
	for k, v := range roles {
		result[k] = marshalValue(v)
	}
	return result
}

// marshalValue converts a SemanticValue to a JSON-friendly map.
func marshalValue(v SemanticValue) map[string]any {
	m := map[string]any{"type": string(v.Type)}
	switch v.Type {
	case TypeSelector, TypeReference:
		m["value"] = v.Value
		if v.Type == TypeSelector && v.SelectorKind != "" {
			m["selectorKind"] = v.SelectorKind
		}
	case TypeLiteral:
		m["value"] = v.Value
		if v.DataType != "" {
			m["dataType"] = v.DataType
		}
	case TypeExpression, TypePropertyPath:
		m["raw"] = v.Raw
	case TypeFlag:
		m["name"] = v.Name
		m["enabled"] = v.Enabled
	}
	return m
}
