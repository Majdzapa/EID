# Web eID Integration Demo

This repository contains a complete working demo and comprehensive documentation for integrating **Web eID** authentication and document signing into a **Spring Boot 3.x** and **React** application.

## Documentation Table of Contents

1. [Executive Summary & Architecture](architecture.md)
2. [Prerequisites](prerequisites.md)
3. [Authentication Workflow](authentication.md)
4. [Document Signing Workflow](document-signing.md)
5. [Spring Security Integration](spring-security.md)
6. [React Integration](react-integration.md)
7. [Cryptography](cryptography.md)
8. [Certificate Validation](certificate-validation.md)
9. [Security & Threat Model](security.md)
10. [Database Design](database.md)
11. [Deployment & Local Environment](deployment.md)
12. [Troubleshooting](troubleshooting.md)
13. [Web eID Software Setup Guide](setup-guide.md)
14. [Web eID Hardware Stack & Workflow](hardware-stack.md)

## Components
*   **frontend**: A React application using Vite and TypeScript.
*   **backend**: A Spring Boot Java 21 REST API.
*   **docs**: Technical documentation.

## Key Features
*   **Web eID Authentication**: Secure smart-card authentication using the official `web-eid` libraries.
*   **Stateless JWT Security**: The backend uses stateless JSON Web Tokens (JWT) for session management, rather than traditional cookies.
*   **Multiple Profiles**: Run with `prod` (requires actual eID hardware and strict HTTPS) or `demo` (allows simulated login without hardware for easy local testing).
*   **Modern Frontend**: A responsive, modern React UI built with Vite.

## Quick Start
See [Deployment & Local Environment](deployment.md) for detailed instructions on running the demo locally.
