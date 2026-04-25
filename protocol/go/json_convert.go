package lse

import (
	"fmt"
)

// Diagnostic represents a validation error or warning.
type Diagnostic struct {
	Severity string `json:"severity"`
	Code     string `json:"code"`
	Message  string `json:"message"`
}

// ValidateJSON validates a SemanticJSON map. Returns a slice of diagnostics (empty = valid).
func ValidateJSON(data map[string]any) []Diagnostic {
	var diags []Diagnostic

	// Check action
	action, _ := data["action"].(string)
	if action == "" {
		diags = append(diags, Diagnostic{
			Severity: "error",
			Code:     "INVALID_ACTION",
			Message:  "Missing or invalid 'action' field (must be a non-empty string)",
		})
	}

	// Check roles
	if roles, ok := data["roles"].(map[string]any); ok {
		for roleName, rv := range roles {
			roleValue, ok := rv.(map[string]any)
			if !ok {
				diags = append(diags, Diagnostic{
					Severity: "error",
					Code:     "INVALID_ROLE_VALUE",
					Message:  fmt.Sprintf("Role %q must be an object with type and value", roleName),
				})
				continue
			}

			vtype, _ := roleValue["type"].(string)
			validTypes := map[string]bool{
				"selector": true, "literal": true, "reference": true,
				"expression": true, "property-path": true, "flag": true,
			}
			if !validTypes[vtype] {
				diags = append(diags, Diagnostic{
					Severity: "error",
					Code:     "INVALID_VALUE_TYPE",
					Message:  fmt.Sprintf("Role %q has invalid type %q", roleName, vtype),
				})
			}

			_, hasValue := roleValue["value"]
			_, hasRaw := roleValue["raw"]
			if !hasValue && vtype != "expression" && !hasRaw {
				diags = append(diags, Diagnostic{
					Severity: "error",
					Code:     "MISSING_VALUE",
					Message:  fmt.Sprintf("Role %q is missing value field", roleName),
				})
			}
		}
	}

	// Check trigger
	if trigger, ok := data["trigger"].(map[string]any); ok {
		event, _ := trigger["event"].(string)
		if event == "" {
			diags = append(diags, Diagnostic{
				Severity: "error",
				Code:     "INVALID_TRIGGER",
				Message:  "Trigger must have a non-empty 'event' string",
			})
		}
	}

	return diags
}

// FromJSON converts a SemanticJSON map to a SemanticNode.
// Accepts both full-fidelity and LLM-simplified formats.
func FromJSON(data map[string]any) (*SemanticNode, error) {
	action, _ := data["action"].(string)
	rawRoles, _ := data["roles"].(map[string]any)

	roles := make(map[string]SemanticValue)
	for roleName, rv := range rawRoles {
		if roleMap, ok := rv.(map[string]any); ok {
			roles[roleName] = convertJSONValue(roleMap)
		}
	}

	// If trigger present, wrap in event handler
	if trigger, ok := data["trigger"].(map[string]any); ok {
		eventName, _ := trigger["event"].(string)
		eventRoles := map[string]SemanticValue{
			"event": LiteralValue(eventName, "string"),
		}
		bodyNode := SemanticNode{
			Kind:   KindCommand,
			Action: action,
			Roles:  roles,
		}
		return &SemanticNode{
			Kind:   KindEventHandler,
			Action: "on",
			Roles:  eventRoles,
			Body:   []SemanticNode{bodyNode},
		}, nil
	}

	// Check for full-fidelity format with kind
	kind := NodeKind("command")
	if k, ok := data["kind"].(string); ok && k != "" {
		kind = NodeKind(k)
	}

	if kind == KindEventHandler {
		var body []SemanticNode
		if bodyData, ok := data["body"].([]any); ok {
			for _, b := range bodyData {
				if bMap, ok := b.(map[string]any); ok {
					bodyNode, err := FromJSON(bMap)
					if err != nil {
						return nil, err
					}
					body = append(body, *bodyNode)
				}
			}
		}
		ehNode := &SemanticNode{
			Kind:   KindEventHandler,
			Action: action,
			Roles:  roles,
			Body:   body,
		}
		// v1.2: annotations on event-handler
		if anns := deserializeAnnotations(data["annotations"]); anns != nil {
			ehNode.Annotations = anns
		}
		return ehNode, nil
	}

	if kind == KindCompound {
		var stmts []SemanticNode
		if stmtsData, ok := data["statements"].([]any); ok {
			for _, s := range stmtsData {
				if sMap, ok := s.(map[string]any); ok {
					stmtNode, err := FromJSON(sMap)
					if err != nil {
						return nil, err
					}
					stmts = append(stmts, *stmtNode)
				}
			}
		}
		chainType, _ := data["chainType"].(string)
		if chainType == "" {
			chainType = "then"
		}
		cmpNode := &SemanticNode{
			Kind:       KindCompound,
			Action:     action,
			Roles:      roles,
			Statements: stmts,
			ChainType:  chainType,
		}
		// v1.2: annotations on compound
		if anns := deserializeAnnotations(data["annotations"]); anns != nil {
			cmpNode.Annotations = anns
		}
		return cmpNode, nil
	}

	node := &SemanticNode{
		Kind:   KindCommand,
		Action: action,
		Roles:  roles,
	}

	// Deserialize v1.1 conditional fields
	if thenData, ok := data["thenBranch"].([]any); ok {
		for _, t := range thenData {
			if tMap, ok := t.(map[string]any); ok {
				tNode, err := FromJSON(tMap)
				if err != nil {
					return nil, err
				}
				node.ThenBranch = append(node.ThenBranch, *tNode)
			}
		}
	}
	if elseData, ok := data["elseBranch"].([]any); ok {
		for _, e := range elseData {
			if eMap, ok := e.(map[string]any); ok {
				eNode, err := FromJSON(eMap)
				if err != nil {
					return nil, err
				}
				node.ElseBranch = append(node.ElseBranch, *eNode)
			}
		}
	}

	// Deserialize v1.1 loop fields
	if lv, ok := data["loopVariant"].(string); ok {
		node.LoopVariant = lv
	}
	if loopData, ok := data["loopBody"].([]any); ok {
		for _, l := range loopData {
			if lMap, ok := l.(map[string]any); ok {
				lNode, err := FromJSON(lMap)
				if err != nil {
					return nil, err
				}
				node.LoopBody = append(node.LoopBody, *lNode)
			}
		}
	}
	if lvar, ok := data["loopVariable"].(string); ok {
		node.LoopVariable = lvar
	}
	if ivar, ok := data["indexVariable"].(string); ok {
		node.IndexVariable = ivar
	}

	// Deserialize v1.2 command body (used by try, all, race)
	if bodyData, ok := data["body"].([]any); ok {
		for _, b := range bodyData {
			if bMap, ok := b.(map[string]any); ok {
				bNode, err := FromJSON(bMap)
				if err != nil {
					return nil, err
				}
				node.Body = append(node.Body, *bNode)
			}
		}
	}

	// Deserialize v1.2 diagnostics
	if diagsRaw, ok := data["diagnostics"].([]any); ok {
		for _, d := range diagsRaw {
			if dMap, ok := d.(map[string]any); ok {
				level, _ := dMap["level"].(string)
				role, _ := dMap["role"].(string)
				message, _ := dMap["message"].(string)
				code, _ := dMap["code"].(string)
				node.Diagnostics = append(node.Diagnostics, NodeDiagnostic{
					Level:   level,
					Role:    role,
					Message: message,
					Code:    code,
				})
			}
		}
	}

	// Deserialize v1.2 annotations
	if anns := deserializeAnnotations(data["annotations"]); anns != nil {
		node.Annotations = anns
	}

	// Deserialize v1.2 catchBranch
	if catchData, ok := data["catchBranch"].([]any); ok {
		for _, c := range catchData {
			if cMap, ok := c.(map[string]any); ok {
				cNode, err := FromJSON(cMap)
				if err != nil {
					return nil, err
				}
				node.CatchBranch = append(node.CatchBranch, *cNode)
			}
		}
	}

	// Deserialize v1.2 finallyBranch
	if finallyData, ok := data["finallyBranch"].([]any); ok {
		for _, f := range finallyData {
			if fMap, ok := f.(map[string]any); ok {
				fNode, err := FromJSON(fMap)
				if err != nil {
					return nil, err
				}
				node.FinallyBranch = append(node.FinallyBranch, *fNode)
			}
		}
	}

	// Deserialize v1.2 asyncVariant
	if av, ok := data["asyncVariant"].(string); ok {
		if av == "all" || av == "race" {
			node.AsyncVariant = av
		}
	}

	// Deserialize v1.2 asyncBody
	if asyncData, ok := data["asyncBody"].([]any); ok {
		for _, a := range asyncData {
			if aMap, ok := a.(map[string]any); ok {
				aNode, err := FromJSON(aMap)
				if err != nil {
					return nil, err
				}
				node.AsyncBody = append(node.AsyncBody, *aNode)
			}
		}
	}

	// Deserialize v1.2 arms
	if armsRaw, ok := data["arms"].([]any); ok {
		for _, ar := range armsRaw {
			if armMap, ok := ar.(map[string]any); ok {
				patternRaw, hasPattern := armMap["pattern"].(map[string]any)
				if !hasPattern {
					continue
				}
				pattern := convertJSONValue(patternRaw)
				var armBody []SemanticNode
				if armBodyData, ok := armMap["body"].([]any); ok {
					for _, b := range armBodyData {
						if bMap, ok := b.(map[string]any); ok {
							bNode, err := FromJSON(bMap)
							if err != nil {
								return nil, err
							}
							armBody = append(armBody, *bNode)
						}
					}
				}
				node.Arms = append(node.Arms, MatchArm{Pattern: pattern, Body: armBody})
			}
		}
	}

	// Deserialize v1.2 defaultArm
	if defaultData, ok := data["defaultArm"].([]any); ok {
		for _, d := range defaultData {
			if dMap, ok := d.(map[string]any); ok {
				dNode, err := FromJSON(dMap)
				if err != nil {
					return nil, err
				}
				node.DefaultArm = append(node.DefaultArm, *dNode)
			}
		}
	}

	return node, nil
}

// deserializeAnnotations converts a raw JSON annotations array to []Annotation.
// Returns nil if the input is nil, not an array, or empty.
func deserializeAnnotations(raw any) []Annotation {
	arr, ok := raw.([]any)
	if !ok || len(arr) == 0 {
		return nil
	}
	var result []Annotation
	for _, item := range arr {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name, ok := m["name"].(string)
		if !ok || name == "" {
			continue
		}
		ann := Annotation{Name: name}
		if v, ok := m["value"].(string); ok {
			ann.Value = v
		}
		result = append(result, ann)
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

// IsEnvelope returns true if data is an LSEEnvelope (has lseVersion + nodes).
func IsEnvelope(data map[string]any) bool {
	_, hasVersion := data["lseVersion"].(string)
	_, hasNodes := data["nodes"]
	return hasVersion && hasNodes
}

// FromEnvelopeJSON converts a versioned envelope map to an LSEEnvelope.
func FromEnvelopeJSON(data map[string]any) (*LSEEnvelope, error) {
	lseVersion, _ := data["lseVersion"].(string)
	env := &LSEEnvelope{LSEVersion: lseVersion}
	if featuresRaw, ok := data["features"].([]any); ok {
		for _, f := range featuresRaw {
			if s, ok := f.(string); ok {
				env.Features = append(env.Features, s)
			}
		}
	}
	if nodesRaw, ok := data["nodes"].([]any); ok {
		for _, n := range nodesRaw {
			if nMap, ok := n.(map[string]any); ok {
				node, err := FromJSON(nMap)
				if err != nil {
					return nil, err
				}
				env.Nodes = append(env.Nodes, *node)
			}
		}
	}
	return env, nil
}

// ToEnvelopeJSON converts an LSEEnvelope to a JSON-compatible map.
func ToEnvelopeJSON(env *LSEEnvelope) map[string]any {
	result := map[string]any{
		"lseVersion": env.LSEVersion,
		"nodes":      []any{},
	}
	if len(env.Features) > 0 {
		result["features"] = env.Features
	}
	nodeMaps := make([]any, len(env.Nodes))
	for i := range env.Nodes {
		nodeMaps[i] = ToJSON(&env.Nodes[i])
	}
	result["nodes"] = nodeMaps
	return result
}

// ToJSON converts a SemanticNode to a full-fidelity JSON-friendly map.
func ToJSON(node *SemanticNode) map[string]any {
	m := map[string]any{
		"kind":   string(node.Kind),
		"action": node.Action,
		"roles":  marshalRoles(node.Roles),
	}
	if node.Kind == KindEventHandler && len(node.Body) > 0 {
		bodyMaps := make([]any, len(node.Body))
		for i := range node.Body {
			bodyMaps[i] = ToJSON(&node.Body[i])
		}
		m["body"] = bodyMaps
	}
	if node.Kind == KindCommand && len(node.Body) > 0 {
		bodyMaps := make([]any, len(node.Body))
		for i := range node.Body {
			bodyMaps[i] = ToJSON(&node.Body[i])
		}
		m["body"] = bodyMaps
	}
	if node.Kind == KindCompound {
		stmtMaps := make([]any, len(node.Statements))
		for i := range node.Statements {
			stmtMaps[i] = ToJSON(&node.Statements[i])
		}
		m["statements"] = stmtMaps
		if node.ChainType != "" {
			m["chainType"] = node.ChainType
		}
	}
	// v1.1 conditional fields
	if len(node.ThenBranch) > 0 {
		maps := make([]any, len(node.ThenBranch))
		for i := range node.ThenBranch {
			maps[i] = ToJSON(&node.ThenBranch[i])
		}
		m["thenBranch"] = maps
	}
	if len(node.ElseBranch) > 0 {
		maps := make([]any, len(node.ElseBranch))
		for i := range node.ElseBranch {
			maps[i] = ToJSON(&node.ElseBranch[i])
		}
		m["elseBranch"] = maps
	}
	// v1.1 loop fields
	if node.LoopVariant != "" {
		m["loopVariant"] = node.LoopVariant
	}
	if len(node.LoopBody) > 0 {
		maps := make([]any, len(node.LoopBody))
		for i := range node.LoopBody {
			maps[i] = ToJSON(&node.LoopBody[i])
		}
		m["loopBody"] = maps
	}
	if node.LoopVariable != "" {
		m["loopVariable"] = node.LoopVariable
	}
	if node.IndexVariable != "" {
		m["indexVariable"] = node.IndexVariable
	}
	// v1.2 fields
	if len(node.Diagnostics) > 0 {
		diags := make([]any, len(node.Diagnostics))
		for i, d := range node.Diagnostics {
			diags[i] = map[string]any{
				"level":   d.Level,
				"role":    d.Role,
				"message": d.Message,
				"code":    d.Code,
			}
		}
		m["diagnostics"] = diags
	}
	if len(node.Annotations) > 0 {
		anns := make([]any, len(node.Annotations))
		for i, a := range node.Annotations {
			if a.Value != "" {
				anns[i] = map[string]any{"name": a.Name, "value": a.Value}
			} else {
				anns[i] = map[string]any{"name": a.Name}
			}
		}
		m["annotations"] = anns
	}
	if len(node.CatchBranch) > 0 {
		maps := make([]any, len(node.CatchBranch))
		for i := range node.CatchBranch {
			maps[i] = ToJSON(&node.CatchBranch[i])
		}
		m["catchBranch"] = maps
	}
	if len(node.FinallyBranch) > 0 {
		maps := make([]any, len(node.FinallyBranch))
		for i := range node.FinallyBranch {
			maps[i] = ToJSON(&node.FinallyBranch[i])
		}
		m["finallyBranch"] = maps
	}
	if node.AsyncVariant != "" {
		m["asyncVariant"] = node.AsyncVariant
	}
	if len(node.AsyncBody) > 0 {
		maps := make([]any, len(node.AsyncBody))
		for i := range node.AsyncBody {
			maps[i] = ToJSON(&node.AsyncBody[i])
		}
		m["asyncBody"] = maps
	}
	if len(node.Arms) > 0 {
		arms := make([]any, len(node.Arms))
		for i, arm := range node.Arms {
			bodyMaps := make([]any, len(arm.Body))
			for j := range arm.Body {
				bodyMaps[j] = ToJSON(&arm.Body[j])
			}
			arms[i] = map[string]any{
				"pattern": marshalValue(arm.Pattern),
				"body":    bodyMaps,
			}
		}
		m["arms"] = arms
	}
	if len(node.DefaultArm) > 0 {
		maps := make([]any, len(node.DefaultArm))
		for i := range node.DefaultArm {
			maps[i] = ToJSON(&node.DefaultArm[i])
		}
		m["defaultArm"] = maps
	}
	return m
}

// convertJSONValue converts a JSON value object to a SemanticValue.
func convertJSONValue(data map[string]any) SemanticValue {
	vtype, _ := data["type"].(string)

	switch vtype {
	case "selector":
		val, _ := data["value"].(string)
		sv := SelectorValue(val)
		if sk, ok := data["selectorKind"].(string); ok {
			sv.SelectorKind = sk
		}
		return sv

	case "literal":
		value := data["value"]
		switch v := value.(type) {
		case bool:
			return LiteralValue(v, "boolean")
		case float64:
			// JSON numbers are always float64
			if v == float64(int64(v)) {
				return LiteralValue(int(v), "number")
			}
			return LiteralValue(v, "number")
		default:
			dataType, _ := data["dataType"].(string)
			if dataType == "" {
				dataType = "string"
			}
			s := fmt.Sprintf("%v", value)
			return LiteralValue(s, dataType)
		}

	case "reference":
		val := fmt.Sprintf("%v", data["value"])
		return ReferenceValue(val)

	case "expression":
		raw, _ := data["raw"].(string)
		if raw == "" {
			raw = fmt.Sprintf("%v", data["value"])
		}
		return ExpressionValue(raw)

	case "flag":
		name, _ := data["name"].(string)
		if name == "" {
			name = fmt.Sprintf("%v", data["value"])
		}
		enabled := true
		if e, ok := data["enabled"].(bool); ok {
			enabled = e
		}
		return FlagValue(name, enabled)

	case "property-path":
		val := fmt.Sprintf("%v", data["value"])
		return ExpressionValue(val)

	default:
		val := fmt.Sprintf("%v", data["value"])
		return LiteralValue(val, "string")
	}
}
