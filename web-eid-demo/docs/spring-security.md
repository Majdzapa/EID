# Spring Security Integration

## Architecture

Integrating Web eID into a Spring Boot application requires adapting the standard Spring Security authentication flow. We are shifting from traditional username/password authentication to token-based cryptographic authentication.

The architecture follows a Clean Architecture approach, separating the web layer (Controllers) from the security validation logic and the core business logic.

```text
Controller Layer (AuthRestController)
      |
      v
Security Filter Chain (Spring Security)
  - JwtAuthenticationFilter (Parses JWT from headers)
      |
      v
Authentication Provider (WebEidAuthenticationProvider)
      |
      v
Validation Service (WebEidAuthTokenValidator)
      |
      v
User Identity Service (UserDetailsServiceImpl)
```

## 1. Authentication Filter

Instead of a standard `UsernamePasswordAuthenticationFilter`, we implement a custom authentication flow, typically exposed as a standard REST endpoint (`/api/auth/login`).

When the React frontend submits the Web eID token:
1.  The `AuthRestController` receives the token.
2.  The controller delegates validation to a dedicated service that wraps the `eu.webeid.security.validator.AuthTokenValidator`.

## 2. Authentication Provider & Token Validation

The core of the integration relies on the official `web-eid-authtoken-validation-java` library.

The `AuthTokenValidator` performs the complex cryptographic heavy lifting:
*   **Nonce Validation**: Uses a `ChallengeNonceStore` (often backed by a temporary Spring session or distributed cache) to ensure the nonce is valid and hasn't been reused.
*   **Signature Verification**: Uses Bouncy Castle to verify the signature attached to the token using the public key embedded in the user's certificate.
*   **Trust Validation**: Validates the certificate chain against configured trusted Root CAs.
*   **OCSP Check**: Performs an online check to ensure the certificate isn't revoked.

## 3. Creating the Security Context

If the `AuthTokenValidator` returns successfully, it yields the validated user's `X509Certificate`.

We then map this certificate to a Spring Security `UserDetails` object:

1.  **Identity Extraction**: Extract the user's details from the certificate's `Subject` field. For example, in the Estonian eID profile, the `SerialNumber` attribute contains the national ID code (e.g., `PNOEE-38001085718`), and the `GivenName` and `Surname` fields contain the name.
2.  **User Lookup/Provisioning**: Look up the user in the database using their unique ID code. If they don't exist (and auto-registration is enabled), create a new user record.
3.  **Authentication Object**: Create a `UsernamePasswordAuthenticationToken` (or a custom `WebEidAuthenticationToken`) representing the authenticated user and their authorities/roles.
4.  **SecurityContextHolder**: Set the authentication object in the `SecurityContextHolder`.

## 4. Stateless JWT Authentication

This application uses a **stateless** architecture using JSON Web Tokens (JWT).

1.  After setting the `SecurityContextHolder` in the `/api/auth/login` endpoint, a `JwtService` generates a JWT.
2.  The JWT payload includes the user's `subject` (username/DN) and their assigned roles (e.g., `ROLE_USER`).
3.  The JWT is signed with a secret key (HMAC SHA-256) and returned to the React frontend in the JSON response payload (`{"token": "..."}`).
4.  The frontend stores the JWT (e.g., in `localStorage`) and attaches it to all subsequent requests using the `Authorization: Bearer <token>` header.
5.  A custom `JwtAuthenticationFilter` intercepts incoming requests. If a Bearer token is found, it validates the token's signature and expiration using `jjwt`.
6.  If valid, the filter reconstructs the `UsernamePasswordAuthenticationToken` (with the extracted roles) and places it into the `SecurityContextHolder`, authorizing the request.
7.  The Spring Security `SessionCreationPolicy` is explicitly set to `STATELESS`, ensuring no `JSESSIONID` cookies are created or used.

## 5. Security Considerations

*   **CSRF**: If using cookie-based sessions, CSRF protection MUST be enabled in Spring Security. The React app must read the CSRF token and send it back in headers for mutating requests.
*   **Session Fixation**: Spring Security's default session fixation protection (changing the session ID upon authentication) should remain enabled.
*   **Nonce Storage**: The `ChallengeNonceStore` must strictly enforce single-use nonces to prevent replay attacks.
*   **Trust Anchors**: The application must be securely configured with the correct Root CA certificates. Never trust all certificates.

### References
*   [Spring Security Architecture](https://docs.spring.io/spring-security/reference/servlet/architecture.html)
*   [Web eID Java Token Validation](https://github.com/web-eid/web-eid-authtoken-validation-java)
