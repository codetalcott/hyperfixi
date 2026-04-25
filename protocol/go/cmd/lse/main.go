// CLI for the LokaScript Explicit Syntax (LSE) protocol.
//
// Usage:
//
//	echo '[toggle patient:.active]' | lse parse
//	echo '{"action":"toggle","roles":{...}}' | lse render
//	echo '[toggle patient:.active]' | lse validate
//	echo '[toggle patient:.active]' | lse convert
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	lse "github.com/lokascript/explicit-syntax-go"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: lse <parse|render|validate|convert>")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Commands:")
		fmt.Fprintln(os.Stderr, "  parse     Bracket syntax -> JSON")
		fmt.Fprintln(os.Stderr, "  render    JSON -> Bracket syntax")
		fmt.Fprintln(os.Stderr, "  validate  Check syntax (exit 0 = valid, exit 1 = error)")
		fmt.Fprintln(os.Stderr, "  convert   Auto-detect format, output the other")
		os.Exit(1)
	}

	command := os.Args[1]
	scanner := bufio.NewScanner(os.Stdin)

	hasError := false

	for scanner.Scan() {
		line := scanner.Text()

		// Skip comments and blank lines
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "//") {
			continue
		}

		switch command {
		case "parse":
			if err := cmdParse(trimmed); err != nil {
				fmt.Fprintln(os.Stderr, "Error:", err)
				hasError = true
			}

		case "render":
			if err := cmdRender(trimmed); err != nil {
				fmt.Fprintln(os.Stderr, "Error:", err)
				hasError = true
			}

		case "validate":
			if err := cmdValidate(trimmed); err != nil {
				fmt.Fprintln(os.Stderr, err)
				hasError = true
			}

		case "convert":
			if err := cmdConvert(trimmed); err != nil {
				fmt.Fprintln(os.Stderr, "Error:", err)
				hasError = true
			}

		default:
			fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
			os.Exit(1)
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "Error reading stdin:", err)
		os.Exit(1)
	}

	if hasError {
		os.Exit(1)
	}
}

func cmdParse(input string) error {
	node, err := lse.ParseExplicit(input, nil)
	if err != nil {
		return err
	}
	b, err := json.Marshal(node)
	if err != nil {
		return err
	}
	fmt.Println(string(b))
	return nil
}

func cmdRender(input string) error {
	var data map[string]any
	if err := json.Unmarshal([]byte(input), &data); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	node, err := lse.FromJSON(data)
	if err != nil {
		return err
	}
	fmt.Println(lse.RenderExplicit(node))
	return nil
}

func cmdValidate(input string) error {
	_, err := lse.ParseExplicit(input, nil)
	if err != nil {
		return err
	}
	return nil
}

func cmdConvert(input string) error {
	if lse.IsExplicitSyntax(input) {
		// Bracket -> JSON
		return cmdParse(input)
	}
	// Assume JSON -> Bracket
	return cmdRender(input)
}
