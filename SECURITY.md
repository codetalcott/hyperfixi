# Security Policy

## Supported Versions

The following versions of HyperFixi are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of HyperFixi seriously. If you discover a security vulnerability, please follow these steps:

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
- The HyperFixi parser processes user-provided expressions
- Always validate and sanitize inputs in production environments
- Be cautious with user-generated hyperscript code

## Known Security Considerations

### Expression Evaluation
HyperFixi evaluates hyperscript expressions which can:
- Access and modify the DOM
- Execute event handlers
- Make network requests (via fetch, etc.)

**Recommendation**: Only use HyperFixi with trusted hyperscript code. Do not evaluate untrusted user input directly.

### Server Integration
The server integration package (`@hyperfixi/server-integration`) provides APIs for remote expression evaluation:
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
- Runs build checks to ensure code compiles

### Type Safety
- TypeScript provides static type checking
- Strict TypeScript configuration reduces runtime errors

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

Thank you for helping keep HyperFixi and its users safe!
