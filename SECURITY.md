# Security Policy

## Supported Versions

The following versions of AdHub projects are currently supported with security updates:

| Project | Version | Supported |
|---------|---------|-----------|
| YouTube Downloader | 5.5.x | Yes |
| CardHarvest | 2.0.x | Yes |
| All other projects | Latest | Yes |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in AdHub, please report it responsibly.

### How to Report

1. **Do NOT open a public issue** for security vulnerabilities
2. **Email** the maintainer directly or use GitHub's private vulnerability reporting
3. **Include** the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity (see below)

### Severity Levels

| Severity | Description | Target Resolution |
|----------|-------------|-------------------|
| Critical | Remote code execution, data breach | 24-48 hours |
| High | Authentication bypass, XSS | 7 days |
| Medium | Information disclosure | 14 days |
| Low | Minor issues | 30 days |

## Security Best Practices

### For Users

1. **Keep extensions updated** - Always use the latest version
2. **Review permissions** - Understand what permissions extensions request
3. **Use official sources** - Only install from this repository

### For Contributors

1. **Never commit secrets** - API keys, passwords, tokens
2. **Validate input** - Always sanitize user input
3. **Use HTTPS** - For all external requests
4. **Follow OWASP guidelines** - Avoid common vulnerabilities

### Known Security Considerations

#### Browser Extensions

- Extensions request only necessary permissions
- All data processing happens locally
- No data is sent to external servers (except intended APIs like YouTube, Steam)

#### Native Hosts

- Native messaging hosts run with user privileges
- Communication is local only (stdin/stdout)
- No network listeners

## Security Features

### YouTube Downloader

- Cookies are used only for age-restricted content
- No credentials are stored permanently
- All downloads happen locally via yt-dlp

### CardHarvest

- Steam credentials are processed locally only
- Session tokens stored in local Chrome storage
- 2FA secrets never leave the local machine

## Acknowledgments

We appreciate security researchers who help keep AdHub safe. Contributors who report valid vulnerabilities will be acknowledged here (with permission).

---

Thank you for helping keep AdHub secure!
