package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"time"

	"github.com/lokascript/lokascript-go"
	"github.com/spf13/cobra"
)

var (
	// Global flags
	baseURL            string
	timeout            time.Duration
	retries            int
	authToken          string
	templateVarsJSON   string
	minify             bool
	compatibility      string
	sourceMap          bool
	optimization       bool

	// Root client instance
	client *lokascript.Client
)

func init() {
	rootCmd.PersistentFlags().StringVar(&baseURL, "url", "http://localhost:3000", "LokaScript service URL")
	rootCmd.PersistentFlags().DurationVar(&timeout, "timeout", 30*time.Second, "Request timeout")
	rootCmd.PersistentFlags().IntVar(&retries, "retries", 3, "Number of retry attempts")
	rootCmd.PersistentFlags().StringVar(&authToken, "auth-token", "", "Authentication token")
	rootCmd.PersistentFlags().StringVar(&templateVarsJSON, "template-vars", "", "Template variables as JSON string")
	rootCmd.PersistentFlags().BoolVar(&minify, "minify", false, "Minify compiled JavaScript")
	rootCmd.PersistentFlags().StringVar(&compatibility, "compatibility", "modern", "JavaScript compatibility mode (modern|legacy)")
	rootCmd.PersistentFlags().BoolVar(&sourceMap, "source-map", false, "Generate source maps")
	rootCmd.PersistentFlags().BoolVar(&optimization, "optimization", false, "Enable optimization")
}

var rootCmd = &cobra.Command{
	Use:   "lokascript",
	Short: "LokaScript Go Client - Server-side hyperscript compilation",
	Long: `LokaScript Go Client provides command-line access to server-side hyperscript 
compilation with support for template variables, batch processing, and caching.`,
	PersistentPreRunE: initClient,
}

func initClient(cmd *cobra.Command, args []string) error {
	config := &lokascript.ClientConfig{
		BaseURL:   baseURL,
		Timeout:   timeout,
		Retries:   retries,
		AuthToken: authToken,
		Headers:   make(map[string]string),
	}

	var err error
	client, err = lokascript.NewClient(config)
	return err
}

var healthCmd = &cobra.Command{
	Use:   "health",
	Short: "Check service health",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		health, err := client.Health(ctx)
		if err != nil {
			return fmt.Errorf("health check failed: %w", err)
		}

		fmt.Printf("Status: %s\n", health.Status)
		fmt.Printf("Version: %s\n", health.Version)
		fmt.Printf("Uptime: %dms\n", health.Uptime)
		fmt.Printf("Cache: %d/%d (hit ratio: %.2f%%)\n", 
			health.Cache.Size, health.Cache.MaxSize, health.Cache.HitRatio*100)

		return nil
	},
}

var compileCmd = &cobra.Command{
	Use:   "compile [script...]",
	Short: "Compile hyperscript to JavaScript",
	Long: `Compile hyperscript to JavaScript. You can provide multiple scripts using name=script format.

Examples:
  lokascript compile "on click toggle .active"
  lokascript compile button="on click toggle .active" form="on submit halt"
  lokascript --template-vars '{"userId": 123}' compile "on click fetch /api/users/{{userId}}"`,
	Args: cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		// Parse scripts
		scripts := make(map[string]string)
		for i, arg := range args {
			if strings.Contains(arg, "=") {
				parts := strings.SplitN(arg, "=", 2)
				scripts[parts[0]] = parts[1]
			} else {
				scripts[fmt.Sprintf("script_%d", i)] = arg
			}
		}

		// Parse template variables
		var templateVars map[string]interface{}
		if templateVarsJSON != "" {
			if err := json.Unmarshal([]byte(templateVarsJSON), &templateVars); err != nil {
				return fmt.Errorf("invalid template variables JSON: %w", err)
			}
		}

		// Create compilation options
		var compatMode lokascript.CompatibilityMode
		if compatibility == "legacy" {
			compatMode = lokascript.CompatibilityLegacy
		} else {
			compatMode = lokascript.CompatibilityModern
		}

		options := &lokascript.CompilationOptions{
			Minify:        minify,
			Compatibility: compatMode,
			SourceMap:     sourceMap,
			Optimization:  optimization,
		}

		// Create request
		req := &lokascript.CompileRequest{
			Scripts: scripts,
			Options: options,
		}

		if templateVars != nil {
			req.Context = &lokascript.ParseContext{
				TemplateVars: templateVars,
			}
		}

		// Compile
		result, err := client.Compile(ctx, req)
		if err != nil {
			return fmt.Errorf("compilation failed: %w", err)
		}

		// Output results
		outputFormat, _ := cmd.Flags().GetString("output")
		switch outputFormat {
		case "json":
			jsonData, _ := json.MarshalIndent(result, "", "  ")
			fmt.Println(string(jsonData))
		case "js":
			for name, compiled := range result.Compiled {
				if len(result.Compiled) > 1 {
					fmt.Printf("// %s\n", name)
				}
				fmt.Println(compiled)
				if len(result.Compiled) > 1 {
					fmt.Println()
				}
			}
		default: // event handler attribute format
			for name, compiled := range result.Compiled {
				attr := "onclick"
				if meta, ok := result.Metadata[name]; ok && len(meta.Events) > 0 {
					attr = "on" + meta.Events[0]
				}
				if len(result.Compiled) > 1 {
					fmt.Printf("%s: %s=\"%s\"\n", name, attr, compiled)
				} else {
					fmt.Printf("%s=\"%s\"\n", attr, compiled)
				}
			}
		}

		// Show warnings and errors
		if len(result.Warnings) > 0 {
			fmt.Fprintf(os.Stderr, "\nWarnings:\n")
			for _, warning := range result.Warnings {
				fmt.Fprintf(os.Stderr, "  %s\n", warning.Message)
			}
		}

		if len(result.Errors) > 0 {
			fmt.Fprintf(os.Stderr, "\nErrors:\n")
			for _, errItem := range result.Errors {
				fmt.Fprintf(os.Stderr, "  Line %d: %s\n", errItem.Line, errItem.Message)
			}
			os.Exit(1)
		}

		return nil
	},
}

var validateCmd = &cobra.Command{
	Use:   "validate [script]",
	Short: "Validate hyperscript syntax",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		script := args[0]

		// Parse template variables
		var templateVars map[string]interface{}
		if templateVarsJSON != "" {
			if err := json.Unmarshal([]byte(templateVarsJSON), &templateVars); err != nil {
				return fmt.Errorf("invalid template variables JSON: %w", err)
			}
		}

		// Create request
		req := &lokascript.ValidateRequest{
			Script: script,
		}

		if templateVars != nil {
			req.Context = &lokascript.ParseContext{
				TemplateVars: templateVars,
			}
		}

		// Validate
		result, err := client.Validate(ctx, req)
		if err != nil {
			return fmt.Errorf("validation failed: %w", err)
		}

		if result.Valid {
			fmt.Println("✓ Valid hyperscript")

			// Show metadata if available
			if result.Metadata != nil {
				fmt.Printf("Events: %s\n", strings.Join(result.Metadata.Events, ", "))
				fmt.Printf("Commands: %s\n", strings.Join(result.Metadata.Commands, ", "))
				fmt.Printf("Selectors: %s\n", strings.Join(result.Metadata.Selectors, ", "))
				fmt.Printf("Complexity: %d\n", result.Metadata.Complexity)
			}
		} else {
			fmt.Println("✗ Invalid hyperscript")
			for _, errItem := range result.Errors {
				fmt.Printf("  Line %d: %s\n", errItem.Line, errItem.Message)
			}
			os.Exit(1)
		}

		// Show warnings
		if len(result.Warnings) > 0 {
			fmt.Println("Warnings:")
			for _, warning := range result.Warnings {
				fmt.Printf("  %s\n", warning.Message)
			}
		}

		return nil
	},
}

var batchCmd = &cobra.Command{
	Use:   "batch [file]",
	Short: "Batch compile scripts from JSON file",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		filename := args[0]

		// Read batch file
		data, err := ioutil.ReadFile(filename)
		if err != nil {
			return fmt.Errorf("failed to read batch file: %w", err)
		}

		var req lokascript.BatchCompileRequest
		if err := json.Unmarshal(data, &req); err != nil {
			return fmt.Errorf("invalid JSON in batch file: %w", err)
		}

		// Batch compile
		result, err := client.BatchCompile(ctx, &req)
		if err != nil {
			return fmt.Errorf("batch compilation failed: %w", err)
		}

		fmt.Printf("Compiled %d scripts:\n", len(result.Compiled))
		for name, compiled := range result.Compiled {
			attr := "onclick"
			if meta, ok := result.Metadata[name]; ok && len(meta.Events) > 0 {
				attr = "on" + meta.Events[0]
			}
			fmt.Printf("  %s: %s=\"%s\"\n", name, attr, compiled)
		}

		// Show warnings and errors
		if len(result.Warnings) > 0 {
			fmt.Println("\nWarnings:")
			for _, warning := range result.Warnings {
				fmt.Printf("  %s\n", warning.Message)
			}
		}

		if len(result.Errors) > 0 {
			fmt.Println("\nErrors:")
			for _, errItem := range result.Errors {
				fmt.Printf("  Line %d: %s\n", errItem.Line, errItem.Message)
			}
			os.Exit(1)
		}

		return nil
	},
}

var cacheCmd = &cobra.Command{
	Use:   "cache",
	Short: "Cache management commands",
}

var cacheStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Get cache statistics",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		stats, err := client.CacheStats(ctx)
		if err != nil {
			return fmt.Errorf("failed to get cache stats: %w", err)
		}

		fmt.Printf("Cache size: %d/%d\n", stats.Size, stats.MaxSize)
		fmt.Printf("Hits: %d\n", stats.Hits)
		fmt.Printf("Misses: %d\n", stats.Misses)
		fmt.Printf("Hit ratio: %.2f%%\n", stats.HitRatio*100)

		return nil
	},
}

var cacheClearCmd = &cobra.Command{
	Use:   "clear",
	Short: "Clear compilation cache",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		err := client.ClearCache(ctx)
		if err != nil {
			return fmt.Errorf("failed to clear cache: %w", err)
		}

		fmt.Println("Cache cleared successfully")
		return nil
	},
}

func init() {
	// Add output format flag to compile command
	compileCmd.Flags().String("output", "onclick", "Output format (onclick|js|json)")

	// Add subcommands
	rootCmd.AddCommand(healthCmd)
	rootCmd.AddCommand(compileCmd)
	rootCmd.AddCommand(validateCmd)
	rootCmd.AddCommand(batchCmd)
	rootCmd.AddCommand(cacheCmd)

	// Add cache subcommands
	cacheCmd.AddCommand(cacheStatsCmd)
	cacheCmd.AddCommand(cacheClearCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}