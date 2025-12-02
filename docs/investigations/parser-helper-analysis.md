# Analysis: Helper Method Sharing

I analyzed the literal/identifier patterns across parser files and found significant inconsistencies that prevent simple sharing.

## Inconsistencies

File	Pattern	Example
expression-parser.ts	valueType, has position	{ type: 'literal', value: X, valueType: 'string', start, end }
parser.ts	raw, no position	{ type: 'literal', value: X, raw: '"X"' }
async-commands.ts	raw, no position	{ type: 'literal', value: X, raw: '"X"' }
utility-commands.ts	no raw/valueType, has position	{ type: 'literal', value: X, start, end }
ast-helpers.ts	raw, full Position	{ type: 'literal', value, raw, start, end, line, column }

## Key Differences

expression-parser.ts uses valueType (e.g., 'string', 'number')
parser.ts and async-commands.ts use raw for source representation
utility-commands.ts uses neither raw nor valueType
Position info is inconsistent (some have it, some don't)

## Recommendation

The helpers created in expression-parser.ts are specific to that file's patterns and work well there. Unifying all patterns would require:
Deciding on a standard interface (include raw? valueType? both? make position optional?)
Updating ~25+ call sites across 5+ files
Potentially breaking changes to AST consumers