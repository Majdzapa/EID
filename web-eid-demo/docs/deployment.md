# Deployment & Local Environment

## Local Development Environment Setup

To run this demo application locally, follow these steps:

### 1. Prerequisites
Ensure you have installed:
*   Java 21
*   Node.js (v18+)
*   Maven
*   An eID Smart Card and a compatible USB reader.
*   The [Web eID Native App and Browser Extension](https://www.id.ee/en/).

### 2. Run the Backend (Spring Boot)
Open a terminal in the `backend/` directory.

```bash
cd backend
mvn clean install
mvn spring-boot:run
```
The backend will start on `http://localhost:8080`.
*Note: For a real Web eID implementation, the backend MUST be served over HTTPS or be proxied via a tool like `ngrok` during local development, because Web eID performs strict origin checks and requires secure contexts.* For this demo, we bypass strict origin validation if running on localhost, but this is explicitly disabled in production.

### 3. Run the Frontend (React / Vite)
Open a new terminal in the `frontend/` directory.

```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`. Open this URL in your browser.

## Production Deployment Considerations

Deploying Web eID to production requires strict adherence to security best practices.

### 1. HTTPS is Mandatory
Web eID will **completely refuse to function** over plain HTTP. Your frontend and backend must be served over HTTPS with valid TLS certificates.

### 2. Reverse Proxy & Headers
Typically, Spring Boot sits behind a reverse proxy (Nginx, Traefik, AWS ALB).
*   Ensure `X-Forwarded-Proto: https` and `X-Forwarded-For` are correctly passed so Spring Security knows the connection is secure.
*   Set HSTS (Strict-Transport-Security) headers.

### 3. Cookie Security
If using session cookies (`JSESSIONID`):
*   `Secure = true` (Only send over HTTPS).
*   `HttpOnly = true` (Prevent JavaScript/XSS access).
*   `SameSite = Strict` or `Lax` (Prevent CSRF).

### 4. CORS (Cross-Origin Resource Sharing)
If the frontend and backend are on different domains (e.g., `app.example.com` and `api.example.com`), configure CORS strictly.
*   `Access-Control-Allow-Origin` MUST be explicitly set to the frontend URL (no `*`).
*   `Access-Control-Allow-Credentials: true` (Required to send the session cookie).

### 5. Trust Store Configuration
In production, you MUST explicitly provide a Java Trust Store (`.jks` or `.p12`) containing the Root CA certificates that issued your users' eID cards. Do not rely on the default OS trust store, as it trusts hundreds of commercial CAs that shouldn't be allowed to issue eID certificates.

### 6. Where Components Run
*   **Browser**: React application.
*   **User's OS**: Web eID Native App, Smart Card drivers.
*   **Server**: Spring Boot application, Database (PostgreSQL).
*   **Network**: Interactions between Browser and Server. Interactions between Browser and Native App are strictly local (Native Messaging).
