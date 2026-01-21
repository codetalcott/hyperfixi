# Security Policy

## Supported Versions

The following versions of LokaScript are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of LokaScript seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do Not** Open a Public Issue

Please do not create a public GitHub issue for security vulnerabilities, as this could put users at risk before a fix is available.

### 2. Report Privately

Report security vulnerabilities by:

- Using GitHub's private vulnerability reporting feature (preferred)
- Emailing the maintainers at the contact address in the repository

### 3. Include Details

Please include as much information as possible:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information for follow-up

### 4. Response Timeline

We aim to respond to security reports within:

- **48 hours**: Initial acknowledgment
- **7 days**: Initial assessment and action plan
- **30 days**: Fix implementation and release (for critical issues)

## Security Best Practices for Users

### Dependency Management

- Always use `package-lock.json` to ensure consistent dependency versions
- Regularly update dependencies: `npm audit` and `npm update`
- Review dependency changes in pull requests

### Code Review

- All changes to the main branch require code review (enforced by branch protection)
- Pay special attention to changes in:
  - Parser and tokenizer (`packages/core/src/parser`, `packages/core/src/tokenizer.ts`)
  - Expression evaluation (`packages/core/src/expressions`)
  - Command execution (`packages/core/src/commands`)
  - Server integration (`packages/server-integration`)

### Signed Commits

- All commits to protected branches must be signed with GPG or S/MIME
- This ensures commit authenticity and helps prevent impersonation

### Input Validation

- The LokaScript parser processes user-provided expressions
- Always validate and sanitize inputs in production environments
- Be cautious with user-generated hyperscript code

## Known Security Considerations

### Expression Evaluation

LokaScript evaluates hyperscript expressions which can:

- Access and modify the DOM
- Execute event handlers
- Make network requests (via fetch, etc.)

**Recommendation**: Only use LokaScript with trusted hyperscript code. Do not evaluate untrusted user input directly.

### Server Integration

The server integration package (`@lokascript/server-integration`) provides APIs for remote expression evaluation:

- Implement proper authentication and authorization
- Use rate limiting to prevent abuse
- Validate and sanitize all inputs
- Consider running in a sandboxed environment

### Dependency Security

- Use `npm audit` regularly to check for known vulnerabilities
- Keep Node.js updated (>= 18.0.0)
- Review security advisories for dependencies

## Security Features

### Repository Protection

- Branch protection rules require code review and status checks
- CODEOWNERS file ensures critical code is reviewed by maintainers
- CI/CD pipeline includes security checks

### Pre-commit Hooks

- Husky pre-commit hooks help catch issues before they're committed
- Runs lint and format checks to ensure code quality

### Type Safety

- TypeScript provides static type checking
- Strict TypeScript configuration reduces runtime errors

### Publishing Security

#### Package File Exclusions

All published packages use a whitelist approach via the `files` field in package.json, ensuring only approved files are included in npm packages:

**Included in published packages:**

- `dist/` - Built distribution files
- `src/` - Source code (for debugging and source maps)
- `README.md`, `LICENSE` - Documentation
- Package-specific files only

**Automatically excluded from npm packages:**

- `.npmrc` - npm authentication tokens
- `.yarnrc` / `.yarnrc.yml` - Yarn configuration
- `.env*` - Environment variables
- `.git/` - Git repository data
- `node_modules/` - Dependencies
- Configuration files (`.eslintrc`, `.prettierrc`, etc.)
- Test files and CI/CD configurations

**Verification:**

```bash
# Verify what would be published (dry-run)
npm pack --dry-run --workspace=@lokascript/core
npm pack --dry-run --workspace=@lokascript/semantic
npm pack --dry-run --workspace=@lokascript/i18n
npm pack --dry-run --workspace=@lokascript/vite-plugin
```

#### GitHub Secrets Management

Secrets are securely managed via GitHub repository secrets:

- **NPM_TOKEN**: Used for automated npm publishing (automation token with publish permissions)
- **GITHUB_TOKEN**: Auto-provided by GitHub Actions for repository operations
- **CODECOV_TOKEN**: Optional, for code coverage reporting

**Security measures:**

- Secrets are never logged, echoed, or printed in workflow outputs
- Referenced via `${{ secrets.SECRET_NAME }}` syntax only
- Used in environment variables, not command parameters
- No debug modes enabled that could expose secrets
- Manual workflow triggers only (no automatic publishing)

#### Pre-Publish Validation

Before any package is published, automated checks run:

1. **Version validation** - Ensures semantic versioning compliance
2. **Changelog validation** - Verifies CHANGELOG.md is up to date
3. **Build verification** - Full build of all packages
4. **Test suite** - Complete test coverage (2800+ tests)
5. **TypeScript compilation** - No type errors
6. **Dry-run option** - Test publishing without actual release

See [.github/workflows/pre-publish-check.yml](.github/workflows/pre-publish-check.yml) and [.github/workflows/publish.yml](.github/workflows/publish.yml) for implementation details.

#### Git Repository Protection

Sensitive files are explicitly excluded from version control via `.gitignore`:

```gitignore
# Package manager credentials (security)
.npmrc
.yarnrc
.yarnrc.yml

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**Before committing, always verify:**

```bash
git status --ignored  # Check for accidentally staged sensitive files
```

## Disclosure Policy

When we receive a security report:

1. We confirm the issue and determine its severity
2. We develop and test a fix
3. We release a patch version
4. We publicly disclose the vulnerability after the fix is available
5. We credit the reporter (unless they prefer to remain anonymous)

## Security Updates

Security updates are released as patch versions (e.g., 1.0.1 → 1.0.2) and are clearly marked in the CHANGELOG.md with a "SECURITY" label.

To stay informed about security updates:

- Watch the repository for releases
- Enable GitHub security advisories
- Subscribe to the repository's notifications

## Contact

For security-related questions or concerns that are not vulnerabilities, please open a discussion in the GitHub Discussions tab or contact the maintainers through the repository.

---

Thank you for helping keep LokaScript and its users safe!
