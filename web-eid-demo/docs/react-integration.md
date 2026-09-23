# React Integration

## Overview

Integrating Web eID in a React frontend is straightforward, thanks to the official `web-eid.js` library. The frontend acts as the orchestrator: it fetches data from the backend, triggers the Web eID operations, handles the user experience (loading states, errors), and submits the results back to the backend.

## 1. Setup

First, install the library:
```bash
npm install @webeid/web-eid-library
```

## 2. Authentication Flow Implementation

The authentication flow in React looks like this:

```typescript
import * as webEid from '@webeid/web-eid-library';

async function handleLogin() {
    try {
        // 1. Fetch challenge nonce from Spring Boot
        const challengeResponse = await fetch('/api/auth/challenge');
        const { nonce } = await challengeResponse.json();

        // 2. Invoke Web eID
        // This opens the native app and asks the user for PIN1
        const authResponse = await webEid.authenticate(nonce);

        // 3. Send the auth token (which contains the signature) to the backend
        const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authResponse),
        });

        if (loginResponse.ok) {
            // Authentication successful! Update React state.
            setUserAuthenticated(true);
        } else {
            // Handle backend validation errors
            handleError("Authentication failed on the server.");
        }

    } catch (error) {
        // Handle Web eID specific errors
        handleWebEidError(error);
    }
}
```

## 3. Document Signing Flow Implementation

The signing flow is similar but involves document hashes:

```typescript
import * as webEid from '@webeid/web-eid-library';

async function handleSignDocument(file: File) {
    try {
        // 1. Send file to backend to prepare signing container
        const formData = new FormData();
        formData.append('file', file);
        
        const prepareResponse = await fetch('/api/documents/prepare', {
            method: 'POST',
            body: formData
        });
        const { documentHash, hashAlgorithm } = await prepareResponse.json();

        // 2. Invoke Web eID for signing
        // This asks the user for PIN2
        const signResponse = await webEid.sign(documentHash, hashAlgorithm);

        // 3. Send the signature back to the backend
        const finalizeResponse = await fetch('/api/documents/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signature: signResponse.signature,
                algorithm: signResponse.signatureAlgorithm
            }),
        });

        if (finalizeResponse.ok) {
            // Document successfully signed!
            alert("Document signed successfully.");
        }

    } catch (error) {
        handleWebEidError(error);
    }
}
```

## 4. Error Handling

Proper error handling is critical for a good user experience, as many things can go wrong interacting with hardware. The `web-eid.js` library throws specific error classes that should be caught and presented to the user cleanly.

Common errors to handle:
*   `ExtensionUnavailableError`: The browser extension is not installed. (Show a link to install it).
*   `NativeAppUnavailableError`: The native app is not installed.
*   `UserCancelledError`: The user closed the PIN dialog.
*   `ActionTimeoutError`: The user took too long to enter the PIN.
*   `CardNotRecognizedError` / `SmartCardError`: Issue with the card reader or card.

**TypeScript Interface Example:**
Avoid `any` by typing the responses appropriately or using the types provided by the library.

```typescript
if (error instanceof webEid.errors.ExtensionUnavailableError) {
    showError("Please install the Web eID browser extension.");
} else if (error instanceof webEid.errors.UserCancelledError) {
    showError("Operation was cancelled.");
} else {
    showError("An unexpected error occurred: " + error.message);
}
```

### References
*   [web-eid.js Library](https://github.com/web-eid/web-eid.js)
