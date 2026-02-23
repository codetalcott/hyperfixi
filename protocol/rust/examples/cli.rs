//! CLI for the LokaScript Explicit Syntax (LSE) protocol.
//!
//! Usage:
//!
//!     echo '[toggle patient:.active]' | cargo run --example cli -- parse
//!     echo '{"action":"toggle","roles":{...}}' | cargo run --example cli -- render
//!     echo '[toggle patient:.active]' | cargo run --example cli -- validate
//!     echo '[toggle patient:.active]' | cargo run --example cli -- convert

use std::io::{self, BufRead};
use std::process;

use lokascript_explicit::*;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: lse <parse|render|validate|convert>");
        eprintln!();
        eprintln!("Commands:");
        eprintln!("  parse     Bracket syntax -> JSON");
        eprintln!("  render    JSON -> Bracket syntax");
        eprintln!("  validate  Check syntax (exit 0 = valid, exit 1 = error)");
        eprintln!("  convert   Auto-detect format, output the other");
        process::exit(1);
    }

    let command = &args[1];
    let stdin = io::stdin();
    let mut has_error = false;

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Error reading stdin: {}", e);
                process::exit(1);
            }
        };

        let trimmed = line.trim();
        // Skip comments and blank lines
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("//") {
            continue;
        }

        let result = match command.as_str() {
            "parse" => cmd_parse(trimmed),
            "render" => cmd_render(trimmed),
            "validate" => cmd_validate(trimmed),
            "convert" => cmd_convert(trimmed),
            _ => {
                eprintln!("Unknown command: {}", command);
                process::exit(1);
            }
        };

        if let Err(e) = result {
            eprintln!("Error: {}", e);
            has_error = true;
        }
    }

    if has_error {
        process::exit(1);
    }
}

fn cmd_parse(input: &str) -> Result<(), String> {
    let node = parse_explicit(input, None).map_err(|e| e.to_string())?;
    let json = to_json(&node);
    println!("{}", serde_json::to_string(&json).map_err(|e| e.to_string())?);
    Ok(())
}

fn cmd_render(input: &str) -> Result<(), String> {
    let data: serde_json::Value =
        serde_json::from_str(input).map_err(|e| format!("invalid JSON: {}", e))?;
    let node = from_json(&data)?;
    println!("{}", render_explicit(&node));
    Ok(())
}

fn cmd_validate(input: &str) -> Result<(), String> {
    parse_explicit(input, None).map_err(|e| e.to_string())?;
    Ok(())
}

fn cmd_convert(input: &str) -> Result<(), String> {
    if is_explicit_syntax(input) {
        // Bracket -> JSON
        cmd_parse(input)
    } else {
        // Assume JSON -> Bracket
        cmd_render(input)
    }
}
