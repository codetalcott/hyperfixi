"""Core types for LokaScript Explicit Syntax."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Union


@dataclass(frozen=True)
class SelectorValue:
    """CSS-like selector: #id, .class, [attr], @aria, *wildcard."""

    type: str = "selector"
    value: str = ""
    selectorKind: str | None = None

    def to_dict(self) -> dict:
        d: dict = {"type": self.type, "value": self.value}
        if self.selectorKind is not None:
            d["selectorKind"] = self.selectorKind
        return d


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
class Annotation:
    """Metadata annotation on a node (v1.2)."""
    name: str
    value: str | None = None


@dataclass
class NodeDiagnostic:
    """Type-constraint diagnostic on a node (v1.2)."""
    level: str
    role: str
    message: str
    code: str


@dataclass
class MatchArm:
    """A single arm in a match command (v1.2)."""
    pattern: "SemanticValue"
    body: list["SemanticNode"] = field(default_factory=list)


@dataclass
class LSEEnvelope:
    """Versioned wire-format wrapper (v1.2)."""
    lseVersion: str
    nodes: list["SemanticNode"] = field(default_factory=list)
    features: list[str] | None = None


@dataclass
class SemanticNode:
    """A parsed LSE node."""

    kind: str  # "command", "event-handler", "compound"
    action: str
    roles: dict[str, SemanticValue] = field(default_factory=dict)
    body: list[SemanticNode] = field(default_factory=list)
    statements: list[SemanticNode] = field(default_factory=list)
    chainType: str | None = None  # "then", "and", "async", "sequential"
    # Conditional fields (v1.1)
    thenBranch: list[SemanticNode] = field(default_factory=list)
    elseBranch: list[SemanticNode] = field(default_factory=list)
    # Loop fields (v1.1)
    loopVariant: str | None = None
    loopBody: list[SemanticNode] = field(default_factory=list)
    loopVariable: str | None = None
    indexVariable: str | None = None
    # v1.2 fields
    diagnostics: list[NodeDiagnostic] = field(default_factory=list)
    annotations: list[Annotation] = field(default_factory=list)
    catchBranch: list["SemanticNode"] = field(default_factory=list)
    finallyBranch: list["SemanticNode"] = field(default_factory=list)
    asyncVariant: str | None = None
    asyncBody: list["SemanticNode"] = field(default_factory=list)
    arms: list[MatchArm] = field(default_factory=list)
    defaultArm: list["SemanticNode"] = field(default_factory=list)

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
        # v1.1 conditional fields
        if self.thenBranch:
            d["thenBranch"] = [n.to_dict() for n in self.thenBranch]
        if self.elseBranch:
            d["elseBranch"] = [n.to_dict() for n in self.elseBranch]
        # v1.1 loop fields
        if self.loopVariant is not None:
            d["loopVariant"] = self.loopVariant
        if self.loopBody:
            d["loopBody"] = [n.to_dict() for n in self.loopBody]
        if self.loopVariable is not None:
            d["loopVariable"] = self.loopVariable
        if self.indexVariable is not None:
            d["indexVariable"] = self.indexVariable
        # v1.2 diagnostics
        if self.diagnostics:
            d["diagnostics"] = [
                {"level": diag.level, "role": diag.role,
                 "message": diag.message, "code": diag.code}
                for diag in self.diagnostics
            ]
        # v1.2 annotations
        if self.annotations:
            d["annotations"] = [
                {"name": a.name, "value": a.value} if a.value is not None
                else {"name": a.name}
                for a in self.annotations
            ]
        # v1.2 body for command nodes (try/all/race) — event-handler body is handled above
        if self.kind == "command" and self.body:
            d["body"] = [n.to_dict() for n in self.body]
        # v1.2 catchBranch / finallyBranch
        if self.catchBranch:
            d["catchBranch"] = [n.to_dict() for n in self.catchBranch]
        if self.finallyBranch:
            d["finallyBranch"] = [n.to_dict() for n in self.finallyBranch]
        # v1.2 asyncVariant / asyncBody
        if self.asyncVariant is not None:
            d["asyncVariant"] = self.asyncVariant
        if self.asyncBody:
            d["asyncBody"] = [n.to_dict() for n in self.asyncBody]
        # v1.2 arms / defaultArm
        if self.arms:
            d["arms"] = [
                {"pattern": arm.pattern.to_dict(), "body": [n.to_dict() for n in arm.body]}
                for arm in self.arms
            ]
        if self.defaultArm:
            d["defaultArm"] = [n.to_dict() for n in self.defaultArm]
        return d
