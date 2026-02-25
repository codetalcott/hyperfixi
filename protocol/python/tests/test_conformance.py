"""Conformance tests — runs against shared test-fixtures/*.json."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lokascript_explicit.parser import parse_explicit, ParseError
from lokascript_explicit.renderer import render_explicit
from lokascript_explicit.json_convert import from_json, to_json, from_envelope_json, to_envelope_json, is_envelope
from lokascript_explicit.types import Annotation, NodeDiagnostic, MatchArm, LSEEnvelope

FIXTURES_DIR = Path(__file__).parent.parent.parent / "test-fixtures"


def _load_fixtures(filename: str) -> list[dict]:
    path = FIXTURES_DIR / filename
    if not path.exists():
        pytest.skip(f"Fixture file not found: {path}")
    with open(path) as f:
        return json.load(f)


def _assert_roles_match(actual_roles: dict, expected_roles: dict, test_id: str):
    """Assert that parsed roles match expected roles from fixture."""
    assert set(actual_roles.keys()) == set(
        expected_roles.keys()
    ), f"[{test_id}] Role keys mismatch: {set(actual_roles.keys())} != {set(expected_roles.keys())}"

    for role_name, expected_val in expected_roles.items():
        actual = actual_roles[role_name]
        assert (
            actual.type == expected_val["type"]
        ), f"[{test_id}] Role '{role_name}' type: {actual.type} != {expected_val['type']}"

        if expected_val["type"] == "flag":
            assert (
                actual.name == expected_val["name"]
            ), f"[{test_id}] Flag name: {actual.name} != {expected_val['name']}"
            assert (
                actual.enabled == expected_val["enabled"]
            ), f"[{test_id}] Flag enabled: {actual.enabled} != {expected_val['enabled']}"
        elif expected_val["type"] == "expression":
            assert (
                actual.raw == expected_val["raw"]
            ), f"[{test_id}] Expression raw: {actual.raw} != {expected_val['raw']}"
        else:
            assert (
                actual.value == expected_val["value"]
            ), f"[{test_id}] Role '{role_name}' value: {actual.value!r} != {expected_val['value']!r}"

            if "dataType" in expected_val:
                assert (
                    actual.dataType == expected_val["dataType"]
                ), f"[{test_id}] Role '{role_name}' dataType: {actual.dataType} != {expected_val['dataType']}"


def _collect_parse_fixtures():
    """Collect all parse test fixtures."""
    cases = []
    for filename in ["basic.json", "selectors.json", "literals.json", "references.json", "flags.json"]:
        for fixture in _load_fixtures(filename):
            if "expected" in fixture and not fixture.get("expectError"):
                cases.append(fixture)
    return cases


def _collect_nested_fixtures():
    """Collect nested/event-handler fixtures."""
    return [f for f in _load_fixtures("nested.json") if "expected" in f]


def _collect_error_fixtures():
    """Collect error fixtures."""
    return [f for f in _load_fixtures("errors.json") if f.get("expectError")]


def _collect_roundtrip_fixtures():
    """Collect round-trip fixtures."""
    return [f for f in _load_fixtures("round-trip.json") if "roundtrip" in f]


# ---- Parse conformance ----

@pytest.mark.parametrize(
    "fixture", _collect_parse_fixtures(), ids=lambda f: f["id"]
)
def test_parse_conformance(fixture):
    node = parse_explicit(fixture["input"])
    expected = fixture["expected"]

    assert node.kind == expected["kind"], f"[{fixture['id']}] kind mismatch"
    assert node.action == expected["action"], f"[{fixture['id']}] action mismatch"
    _assert_roles_match(node.roles, expected["roles"], fixture["id"])


# ---- Nested/event-handler conformance ----

@pytest.mark.parametrize(
    "fixture", _collect_nested_fixtures(), ids=lambda f: f["id"]
)
def test_nested_conformance(fixture):
    node = parse_explicit(fixture["input"])
    expected = fixture["expected"]

    assert node.kind == expected["kind"], f"[{fixture['id']}] kind mismatch"
    assert node.action == expected["action"], f"[{fixture['id']}] action mismatch"
    _assert_roles_match(node.roles, expected["roles"], fixture["id"])

    if "body" in expected:
        assert len(node.body) == len(
            expected["body"]
        ), f"[{fixture['id']}] body length mismatch"
        for i, (actual_body, expected_body) in enumerate(
            zip(node.body, expected["body"])
        ):
            assert (
                actual_body.kind == expected_body["kind"]
            ), f"[{fixture['id']}] body[{i}] kind mismatch"
            assert (
                actual_body.action == expected_body["action"]
            ), f"[{fixture['id']}] body[{i}] action mismatch"
            _assert_roles_match(
                actual_body.roles, expected_body["roles"], f"{fixture['id']}.body[{i}]"
            )


# ---- Error conformance ----

@pytest.mark.parametrize(
    "fixture", _collect_error_fixtures(), ids=lambda f: f["id"]
)
def test_error_conformance(fixture):
    with pytest.raises(ParseError) as exc_info:
        parse_explicit(fixture["input"])

    error_msg = str(exc_info.value).lower()
    expected_substr = fixture["errorContains"].lower()
    assert (
        expected_substr in error_msg
    ), f"[{fixture['id']}] Expected '{fixture['errorContains']}' in error: {exc_info.value}"


# ---- Round-trip conformance ----

@pytest.mark.parametrize(
    "fixture", _collect_roundtrip_fixtures(), ids=lambda f: f["id"]
)
def test_roundtrip_conformance(fixture):
    node = parse_explicit(fixture["input"])
    rendered = render_explicit(node)
    reparsed = parse_explicit(rendered)

    # Semantic equivalence after round-trip
    assert (
        reparsed.action == node.action
    ), f"[{fixture['id']}] action changed after round-trip"
    assert (
        reparsed.roles == node.roles
    ), f"[{fixture['id']}] roles changed after round-trip"


# ---- v1.1 helpers ----


def _assert_node_array_match(actual_nodes, expected_nodes, test_id, field_name):
    """Assert that a list of SemanticNodes matches expected JSON array."""
    assert len(actual_nodes) == len(
        expected_nodes
    ), f"[{test_id}] {field_name} length: {len(actual_nodes)} != {len(expected_nodes)}"
    for i, (ab, eb) in enumerate(zip(actual_nodes, expected_nodes)):
        assert (
            ab.kind == eb["kind"]
        ), f"[{test_id}] {field_name}[{i}] kind: {ab.kind} != {eb['kind']}"
        assert (
            ab.action == eb["action"]
        ), f"[{test_id}] {field_name}[{i}] action: {ab.action} != {eb['action']}"
        _assert_roles_match(ab.roles, eb["roles"], f"{test_id}.{field_name}[{i}]")


# ---- Structural roles conformance (v1.1) ----


def _collect_structural_roles_fixtures():
    """Collect structural role fixtures."""
    return [f for f in _load_fixtures("structural-roles.json") if "expected" in f]


@pytest.mark.parametrize(
    "fixture", _collect_structural_roles_fixtures(), ids=lambda f: f["id"]
)
def test_structural_roles_conformance(fixture):
    node = parse_explicit(fixture["input"])
    expected = fixture["expected"]

    assert node.kind == expected["kind"], f"[{fixture['id']}] kind mismatch"
    assert node.action == expected["action"], f"[{fixture['id']}] action mismatch"
    _assert_roles_match(node.roles, expected["roles"], fixture["id"])

    if "thenBranch" in expected:
        _assert_node_array_match(
            node.thenBranch, expected["thenBranch"], fixture["id"], "thenBranch"
        )


# ---- Conditional conformance (v1.1) ----


def _collect_conditional_parse_fixtures():
    """Collect conditional parse fixtures."""
    return [
        f
        for f in _load_fixtures("conditionals.json")
        if "input" in f and "expected" in f
    ]


def _collect_conditional_roundtrip_fixtures():
    """Collect conditional JSON round-trip fixtures."""
    return [
        f
        for f in _load_fixtures("conditionals.json")
        if "jsonInput" in f and f.get("expectedRoundTrip")
    ]


@pytest.mark.parametrize(
    "fixture", _collect_conditional_parse_fixtures(), ids=lambda f: f["id"]
)
def test_conditionals_parse_conformance(fixture):
    node = parse_explicit(fixture["input"])
    expected = fixture["expected"]

    assert node.kind == expected["kind"], f"[{fixture['id']}] kind mismatch"
    assert node.action == expected["action"], f"[{fixture['id']}] action mismatch"
    _assert_roles_match(node.roles, expected["roles"], fixture["id"])

    if "thenBranch" in expected:
        _assert_node_array_match(
            node.thenBranch, expected["thenBranch"], fixture["id"], "thenBranch"
        )
    if "elseBranch" in expected:
        _assert_node_array_match(
            node.elseBranch, expected["elseBranch"], fixture["id"], "elseBranch"
        )


@pytest.mark.parametrize(
    "fixture", _collect_conditional_roundtrip_fixtures(), ids=lambda f: f["id"]
)
def test_conditionals_roundtrip_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)

    assert (
        node2.action == node.action
    ), f"[{fixture['id']}] action not preserved"
    assert len(node2.thenBranch) == len(
        node.thenBranch
    ), f"[{fixture['id']}] thenBranch length not preserved"
    assert len(node2.elseBranch) == len(
        node.elseBranch
    ), f"[{fixture['id']}] elseBranch length not preserved"


# ---- Loop conformance (v1.1) ----


def _collect_loop_fixtures():
    """Collect loop JSON round-trip fixtures."""
    return [
        f
        for f in _load_fixtures("loops.json")
        if "jsonInput" in f and f.get("expectedRoundTrip")
    ]


@pytest.mark.parametrize(
    "fixture", _collect_loop_fixtures(), ids=lambda f: f["id"]
)
def test_loops_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)

    assert (
        node2.action == node.action
    ), f"[{fixture['id']}] action not preserved"
    assert (
        node2.loopVariant == node.loopVariant
    ), f"[{fixture['id']}] loopVariant not preserved"
    assert len(node2.loopBody) == len(
        node.loopBody
    ), f"[{fixture['id']}] loopBody length not preserved"
    assert (
        node2.loopVariable == node.loopVariable
    ), f"[{fixture['id']}] loopVariable not preserved"
    assert (
        node2.indexVariable == node.indexVariable
    ), f"[{fixture['id']}] indexVariable not preserved"


# ---- Type constraints conformance (v1.2) ----


def _collect_type_constraints_fixtures():
    return [f for f in _load_fixtures("type-constraints.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_type_constraints_fixtures(), ids=lambda f: f["id"])
def test_type_constraints_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    if fixture.get("noDiagnostics"):
        assert not node2.diagnostics
    else:
        expected_diags = fixture["jsonInput"].get("diagnostics", [])
        assert len(node2.diagnostics) == len(expected_diags)
        for i, ed in enumerate(expected_diags):
            assert node2.diagnostics[i].level == ed["level"]
            assert node2.diagnostics[i].role == ed["role"]
            assert node2.diagnostics[i].code == ed["code"]


# ---- Annotations conformance (v1.2) ----


def _collect_annotations_fixtures():
    return [f for f in _load_fixtures("annotations.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_annotations_fixtures(), ids=lambda f: f["id"])
def test_annotations_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    if fixture.get("noAnnotations"):
        assert not node2.annotations
        assert "annotations" not in json_out
        return
    if fixture.get("noAnnotationValue"):
        assert len(node2.annotations) >= 1
        assert node2.annotations[0].value is None
        return
    if "annotationOrder" in fixture:
        actual_order = [a.name for a in node2.annotations]
        assert actual_order == fixture["annotationOrder"]
    assert len(node2.annotations) == len(node.annotations)
    for i, a in enumerate(node.annotations):
        assert node2.annotations[i].name == a.name
        assert node2.annotations[i].value == a.value


# ---- Try/catch conformance (v1.2) ----


def _collect_try_catch_fixtures():
    return [f for f in _load_fixtures("try-catch.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_try_catch_fixtures(), ids=lambda f: f["id"])
def test_try_catch_conformance(fixture):
    ji = fixture["jsonInput"]
    node = from_json(ji)
    json_out = to_json(node)
    node2 = from_json(json_out)
    # body
    assert len(node2.body) == len(ji.get("body", []))
    # catchBranch
    if fixture.get("noCatch"):
        assert not node2.catchBranch
    elif "expectedCatchLength" in fixture:
        assert len(node2.catchBranch) == fixture["expectedCatchLength"]
    # finallyBranch
    if fixture.get("noFinally"):
        assert not node2.finallyBranch
    elif "expectedFinallyLength" in fixture:
        assert len(node2.finallyBranch) == fixture["expectedFinallyLength"]
    # annotations
    if "expectedAnnotationCount" in fixture:
        assert len(node2.annotations) == fixture["expectedAnnotationCount"]


# ---- Async coordination conformance (v1.2) ----


def _collect_async_fixtures():
    return [f for f in _load_fixtures("async-coordination.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_async_fixtures(), ids=lambda f: f["id"])
def test_async_coordination_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    if "expectedAsyncVariant" in fixture:
        assert node2.asyncVariant == fixture["expectedAsyncVariant"]
    if "expectedAsyncBodyLength" in fixture:
        assert len(node2.asyncBody) == fixture["expectedAsyncBodyLength"]
    if "expectedAnnotationCount" in fixture:
        assert len(node2.annotations) == fixture["expectedAnnotationCount"]


# ---- Pipe conformance (v1.2) ----


def _collect_pipe_fixtures():
    return [f for f in _load_fixtures("pipe.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_pipe_fixtures(), ids=lambda f: f["id"])
def test_pipe_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    if "expectedChainType" in fixture:
        assert node2.chainType == fixture["expectedChainType"]
    if "expectedStatementCount" in fixture:
        assert len(node2.statements) == fixture["expectedStatementCount"]
    if fixture.get("notPipe"):
        assert node2.chainType != "pipe"
    if "expectedAnnotationCount" in fixture:
        assert len(node2.annotations) == fixture["expectedAnnotationCount"]


# ---- Match conformance (v1.2) ----


def _collect_match_fixtures():
    return [f for f in _load_fixtures("match.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_match_fixtures(), ids=lambda f: f["id"])
def test_match_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    if "expectedArmCount" in fixture:
        assert len(node2.arms) == fixture["expectedArmCount"]
    if fixture.get("noDefaultArm"):
        assert not node2.defaultArm
    if fixture.get("expectedDefaultArm"):
        assert len(node2.defaultArm) > 0
    if "expectedArmBodyLength" in fixture and node2.arms:
        assert len(node2.arms[0].body) == fixture["expectedArmBodyLength"]
    if "expectedArmPatternType" in fixture and node2.arms:
        assert node2.arms[0].pattern.type == fixture["expectedArmPatternType"]
    if "expectedArmPatternValue" in fixture and node2.arms:
        assert node2.arms[0].pattern.value == fixture["expectedArmPatternValue"]


# ---- Version envelope conformance (v1.2) ----


def _collect_version_envelope_fixtures():
    return [f for f in _load_fixtures("version-envelope.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_version_envelope_fixtures(), ids=lambda f: f["id"])
def test_version_envelope_conformance(fixture):
    ji = fixture["jsonInput"]
    assert is_envelope(ji)
    envelope = from_envelope_json(ji)
    if "expectedVersion" in fixture:
        assert envelope.lseVersion == fixture["expectedVersion"]
    if "expectedNodeCount" in fixture:
        assert len(envelope.nodes) == fixture["expectedNodeCount"]
    if "expectedFeatures" in fixture:
        assert envelope.features == fixture["expectedFeatures"]
    # round-trip
    json_out = to_envelope_json(envelope)
    envelope2 = from_envelope_json(json_out)
    assert envelope2.lseVersion == envelope.lseVersion
    assert len(envelope2.nodes) == len(envelope.nodes)

def test_bare_node_is_not_envelope():
    bare = {"kind": "command", "action": "toggle", "roles": {}}
    assert not is_envelope(bare)


# ---- Expression values conformance (v1.2) ----


def _collect_expression_fixtures():
    return [f for f in _load_fixtures("expression-values.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_expression_fixtures(), ids=lambda f: f["id"])
def test_expression_values_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    if "expectedExpressionRaw" in fixture:
        expr_role = next(
            (v for v in node2.roles.values() if v.type == "expression"), None
        )
        assert expr_role is not None, "no expression role found"
        assert expr_role.raw == fixture["expectedExpressionRaw"]


# ---- Unicode values conformance (v1.2) ----


def _collect_unicode_fixtures():
    return [f for f in _load_fixtures("unicode-values.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_unicode_fixtures(), ids=lambda f: f["id"])
def test_unicode_values_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    if "expectedSelectorValue" in fixture:
        sel_role = next((v for v in node2.roles.values() if v.type == "selector"), None)
        assert sel_role is not None
        assert sel_role.value == fixture["expectedSelectorValue"]
    if "expectedLiteralValue" in fixture:
        lit_role = next((v for v in node2.roles.values() if v.type == "literal"), None)
        assert lit_role is not None
        assert lit_role.value == fixture["expectedLiteralValue"]
    if "expectedReferenceValue" in fixture:
        ref_role = next((v for v in node2.roles.values() if v.type == "reference"), None)
        assert ref_role is not None
        assert ref_role.value == fixture["expectedReferenceValue"]


# ---- Deep nesting conformance (v1.2) ----


def _collect_deep_nesting_fixtures():
    return [f for f in _load_fixtures("deep-nesting.json")
            if "jsonInput" in f and f.get("expectedRoundTrip")]

@pytest.mark.parametrize("fixture", _collect_deep_nesting_fixtures(), ids=lambda f: f["id"])
def test_deep_nesting_conformance(fixture):
    node = from_json(fixture["jsonInput"])
    json_out = to_json(node)
    node2 = from_json(json_out)
    assert node2.kind == node.kind
    assert node2.action == node.action
    if "expectedAsyncVariant" in fixture:
        assert node2.asyncVariant == fixture["expectedAsyncVariant"]
    if "expectedAsyncBodyLength" in fixture:
        assert len(node2.asyncBody) == fixture["expectedAsyncBodyLength"]
