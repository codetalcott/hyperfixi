"""Core types for LokaScript Explicit Syntax."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Union


@dataclass(frozen=True)
class SelectorValue:
    """CSS-like selector: #id, .class, [attr], @aria, *wildcard."""

    type: str = "selector"
    value: str = ""

    def to_dict(self) -> dict:
        return {"type": self.type, "value": self.value}


@dataclass(frozen=True)
class LiteralValue:
    """Literal value: string, number, boolean, or duration."""

    type: str = "literal"
    value: Union[str, int, float, bool] = ""
    dataType: str | None = None  # "string", "number", "boolean", "duration"

    def to_dict(self) -> dict:
        d: dict = {"type": self.type, "value": self.value}
        if self.dataType is not None:
            d["dataType"] = self.dataType
        return d


@dataclass(frozen=True)
class ReferenceValue:
    """Built-in symbolic reference: me, you, it, result, event, target, body."""

    type: str = "reference"
    value: str = ""

    def to_dict(self) -> dict:
        return {"type": self.type, "value": self.value}


@dataclass(frozen=True)
class ExpressionValue:
    """Raw expression or nested bracket syntax."""

    type: str = "expression"
    raw: str = ""

    def to_dict(self) -> dict:
        return {"type": self.type, "raw": self.raw}


@dataclass(frozen=True)
class FlagValue:
    """Boolean flag: +enabled or ~disabled."""

    type: str = "flag"
    name: str = ""
    enabled: bool = True

    def to_dict(self) -> dict:
        return {"type": self.type, "name": self.name, "enabled": self.enabled}


# Union type for all semantic values
SemanticValue = Union[SelectorValue, LiteralValue, ReferenceValue, ExpressionValue, FlagValue]


@dataclass
class SemanticNode:
    """A parsed LSE node."""

    kind: str  # "command", "event-handler", "compound"
    action: str
    roles: dict[str, SemanticValue] = field(default_factory=dict)
    body: list[SemanticNode] = field(default_factory=list)
    statements: list[SemanticNode] = field(default_factory=list)
    chainType: str | None = None  # "then", "and", "async", "sequential"

    def to_dict(self) -> dict:
        d: dict = {
            "kind": self.kind,
            "action": self.action,
            "roles": {k: v.to_dict() for k, v in self.roles.items()},
        }
        if self.kind == "event-handler" and self.body:
            d["body"] = [n.to_dict() for n in self.body]
        if self.kind == "compound":
            d["statements"] = [n.to_dict() for n in self.statements]
            if self.chainType:
                d["chainType"] = self.chainType
        return d
