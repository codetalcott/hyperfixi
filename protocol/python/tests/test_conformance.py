"""Conformance tests — runs against shared test-fixtures/*.json."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lokascript_explicit.parser import parse_explicit, ParseError
from lokascript_explicit.renderer import render_explicit

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
