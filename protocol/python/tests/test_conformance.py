"""Conformance tests — runs against shared test-fixtures/*.json."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lokascript_explicit.parser import parse_explicit, ParseError
from lokascript_explicit.renderer import render_explicit
from lokascript_explicit.json_convert import from_json, to_json

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
