# Basic Analysis Example

This example demonstrates fundamental AST analysis capabilities including:

- AST traversal using the visitor pattern
- Finding specific nodes by type
- Calculating code complexity metrics
- Detecting code smells and patterns

## What This Example Shows

1. **Node Discovery**: How to find specific types of nodes in an AST
2. **Complexity Analysis**: Calculating cyclomatic, cognitive, and Halstead complexity
3. **Code Quality**: Detecting code smells and maintainability issues
4. **Pattern Recognition**: Identifying common hyperscript patterns

## Key Concepts

- **Visitor Pattern**: Systematic traversal of AST nodes
- **Node Filtering**: Finding nodes that match specific criteria
- **Metrics Calculation**: Quantitative code analysis
- **Quality Assessment**: Identifying potential improvements

## Usage

```bash
npx tsx example.ts
```

## Expected Output

The example will analyze sample hyperscript code and output:

- Node count statistics
- Complexity metrics
- Detected code smells
- Suggested improvements
- Common patterns found

## Sample Input

The example analyzes a complex interactive hyperscript program with:
- Multiple event handlers
- Conditional logic
- AJAX requests
- DOM manipulation
- Form validation

## Learning Outcomes

After running this example, you'll understand:

- How to traverse AST structures efficiently
- Which metrics are most useful for code quality
- How to identify common hyperscript patterns
- When and how to suggest code improvements