# Documentation

Welcome to the project documentation. This directory contains comprehensive guides and documentation for understanding and working with the codebase.

## Available Documentation

### 📐 [Architecture Documentation](./docs/architecture.md)

Comprehensive guide to the project's architecture, including:

- Clean Architecture layers
- CQRS pattern implementation
- Hexagonal Architecture (Ports & Adapters)
- Module structure
- Dependency flow
- Best practices

**Read this first** to understand how the codebase is organized and why certain patterns are used.

### 🏗️ [Creating a New Module](./docs/creating-a-new-module.md)

Step-by-step guide for creating a new feature module, including:

- Directory structure
- Domain layer setup
- Application layer (commands, queries, handlers)
- Infrastructure layer (adapters)
- Presentation layer (controllers, DTOs)
- Module registration

**Use this guide** when you need to add new features to the application.

### 🧪 [Testing Auth Endpoints](./docs/testing-auth-endpoints.md)

Complete guide for testing authentication endpoints, including:

- Base URL and API structure
- Testing methods (Swagger, cURL, Postman)
- Step-by-step testing flow
- Request/response examples
- Common issues and troubleshooting
- Complete testing scripts

**Use this guide** to test authentication functionality and understand the API flow.

### 🚀 [Production Release](./docs/production-release.md)

Production migration/seed runbook and the one-off administrator bootstrap command.

## Quick Start

1. **New to the project?** Start with [Architecture Documentation](./architecture.md)
2. **Want to test the API?** Check [Testing Auth Endpoints](./testing-auth-endpoints.md)
3. **Need to add a feature?** Follow [Creating a New Module](./creating-a-new-module.md)
4. **Reference implementation:** Check the `auth` module (`src/auth/`) as an example

## Contributing

When adding new documentation:

- Keep it clear and concise
- Include code examples
- Update this README if adding new documents
- Follow the existing documentation style
