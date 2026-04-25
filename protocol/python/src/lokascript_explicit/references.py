"""Default reference set for LSE."""

DEFAULT_REFERENCES: frozenset[str] = frozenset(
    {"me", "you", "it", "result", "event", "target", "body"}
)


def is_valid_reference(
    value: str, reference_set: frozenset[str] | set[str] | None = None
) -> bool:
    """Check if a value is a valid reference name."""
    refs = reference_set if reference_set is not None else DEFAULT_REFERENCES
    return value in refs
