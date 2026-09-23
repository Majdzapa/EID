# Troubleshooting

Integrating hardware-based authentication naturally introduces points of failure on the user's machine. This guide covers common issues and how to resolve them.

## 1. "Web eID extension is not installed"
*   **Cause**: The browser cannot communicate with the native app because the bridge extension is missing.
*   **Solution**: Prompt the user to install the Web eID extension for their specific browser (Chrome, Firefox, Edge, Safari). Provide a link to the official store.

## 2. "Native Web eID application is not installed"
*   **Cause**: The extension is installed, but it cannot find the native application on the OS.
*   **Solution**: The user needs to download and install the official eID software package for their operating system (e.g., from id.ee).

## 3. "No smart card reader detected" / "Please insert a smart card"
*   **Cause**: The physical hardware is missing, disconnected, or drivers are faulty.
*   **Solution**: 
    *   Ensure the reader is plugged in securely.
    *   Ensure the smart card is inserted correctly (chip facing up/down depending on reader).
    *   Restart the browser or the eID background service (e.g., `pcscd` on Linux).

## 4. "Action timeout"
*   **Cause**: The user did not enter their PIN within the allowed time window (usually a few minutes).
*   **Solution**: Tell the user to try again and enter the PIN promptly.

## 5. "User cancelled"
*   **Cause**: The user explicitly closed the PIN dialog box.
*   **Solution**: Handled gracefully in the UI. No action needed other than allowing them to try again.

## 6. Backend Error: "Origin mismatch"
*   **Cause**: The origin URL where the React app is hosted (e.g., `https://my-app.com`) does not exactly match the allowed origin configured in the Spring Boot `AuthTokenValidator`.
*   **Solution**: Ensure the `AuthTokenValidatorBuilder.withSiteOrigin()` exactly matches the public-facing URL of the frontend, including `https://` and port numbers if applicable.

## 7. Backend Error: "Certificate revoked" or "OCSP validation failed"
*   **Cause**: The user's certificate has been explicitly revoked (e.g., reported lost) or the OCSP server is unreachable.
*   **Solution**: If revoked, the user cannot authenticate. If unreachable, ensure the backend server has outbound internet access to reach the CA's OCSP responder URLs.

## 8. Backend Error: "Nonce expired" or "Nonce not found"
*   **Cause**: The user took too long between requesting the challenge and submitting the signature, or the backend cache was cleared.
*   **Solution**: Ask the user to refresh the page or click Login again to generate a new challenge.

## 9. "ERR_SSL_PROTOCOL_ERROR" or similar browser errors
*   **Cause**: Web eID relies on secure contexts. If you attempt to access the frontend via an IP address like `192.168.x.x` over HTTP, the browser might block the extension's execution.
*   **Solution**: Use `localhost` (which browsers treat as a secure context) or configure HTTPS with a valid certificate.
