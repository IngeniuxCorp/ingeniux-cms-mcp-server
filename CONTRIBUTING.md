# Contributing to Ingeniux CMS MCP Server

Thank you for your interest in contributing to the Ingeniux CMS MCP Server! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- Git
- Access to an Ingeniux CMS instance for testing

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/ingeniux-cms-mcp-server.git
   cd ingeniux-cms-mcp-server
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment:
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

5. Build and test:
   ```bash
   npm run build
   npm test
   ```

## Code Standards

### File Organization

- Keep all files under 500 lines
- Break large components into smaller, focused modules
- Use clear, descriptive file and directory names
- Follow the existing project structure

### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide explicit type annotations
- Avoid `any` type - use proper typing
- Export interfaces and types from appropriate modules

### Code Style

- Use tabs for indentation (not spaces)
- Write descriptive comments for complex logic
- Follow existing naming conventions
- Use meaningful variable and function names

### Error Handling

- Implement comprehensive error handling with try-catch blocks
- Perform null/undefined checking
- Provide meaningful error messages
- Log errors with appropriate context

## Architecture Principles

### Modular Design

- Separate concerns into distinct modules
- Keep dependencies minimal and focused
- Use dependency injection where appropriate
- Avoid circular dependencies

### Configuration Management

- Never hardcode secrets or environment values
- Use environment variables for configuration
- Validate configuration at startup
- Provide sensible defaults where possible

### Security

- Validate all inputs
- Use proper authentication and authorization
- Encrypt sensitive data
- Follow OAuth 2.0 best practices

## Contributing Process

### 1. Issues

- Check existing issues before creating new ones
- Use clear, descriptive titles
- Provide reproduction steps for bugs
- Include system information and error messages

### 2. Pull Requests

- Create feature branches from `main`
- Use descriptive branch names (e.g., `feature/add-page-validation`)
- Keep PRs focused on a single change
- Include tests for new functionality
- Update documentation as needed

### 3. Commit Messages

Use conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add OAuth PKCE support
fix(api): handle timeout errors gracefully
docs(readme): add troubleshooting section
```

## Testing

### Unit Tests

- Write tests for all new functionality
- Aim for high test coverage
- Use descriptive test names
- Mock external dependencies

### Integration Tests

- Test complete workflows
- Verify OAuth authentication flow
- Test error handling scenarios
- Use test fixtures for consistent data

### Manual Testing

- Test with actual Ingeniux CMS instance
- Verify all MCP tools work correctly
- Test error scenarios and edge cases
- Document any manual testing steps

## Documentation

### Code Documentation

- Document public APIs with JSDoc
- Explain complex algorithms or business logic
- Provide usage examples for tools
- Keep documentation up to date

### User Documentation

- Update README.md for new features
- Add troubleshooting entries for common issues
- Include configuration examples
- Document breaking changes

## Release Process

### Version Management

- Follow semantic versioning (SemVer)
- Update version in package.json
- Create release notes for changes
- Tag releases in Git

### Quality Assurance

- All tests must pass
- Code must build without warnings
- Documentation must be updated
- Manual testing completed

## Getting Help

- Join discussions in Issues
- Ask questions in pull request comments
- Review existing code for patterns and examples
- Consult the README.md for project overview

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on the technical merit of contributions

Thank you for contributing to make this project better!