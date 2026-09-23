# Security & Threat Model

This document outlines the STRIDE threat model for the Web eID integration.

## STRIDE Analysis

| Threat (STRIDE) | Attack Scenario | Impact | Mitigation (Web eID & Backend) |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker creates a fake eID certificate to impersonate a user. | High | Backend performs strict Certificate Chain Validation. Fails if not signed by a Trusted Root CA. |
| **Spoofing** | User's physical card is stolen, and PIN is guessed. | Critical | Card automatically locks after 3 incorrect PIN attempts. Mitigation relies on user reporting loss, which updates OCSP. |
| **Tampering** | Attacker intercepts and modifies the Web eID Auth Token in transit. | High | The token contains a cryptographic signature over the challenge. Any tampering invalidates the signature mathematically. TLS prevents interception. |
| **Tampering** | Attacker modifies the document hash before it reaches the smart card. | High | Backend calculates the hash. The UI displays what is being signed, but ultimately if the hash is tampered with by malware on the OS, the signature will be valid for the *tampered* hash, but backend validation will fail against the original document. |
| **Repudiation** | User claims they did not sign the document. | High | Use of PIN2 + hardware-backed private key provides strong non-repudiation. The signature is embedded in an ASiC-E container with a timestamped OCSP response. |
| **Information Disclosure** | Attacker attempts to steal the private key. | Critical | Keys are physically locked in the smart card chip. They cannot be exported. Cryptographic operations occur *on* the chip. |
| **Information Disclosure** | Attacker reads sensitive data from backend logs. | Medium | Never log PINs (they don't reach the backend anyway). Avoid logging full certificates unless required for audit, and strip sensitive PII. |
| **Denial of Service** | Attacker floods the backend with login requests. | Medium | Rate limiting on the `/api/auth/challenge` and `/api/auth/login` endpoints. Challenge nonces have short TTLs. |
| **Elevation of Privilege** | Replay Attack: Attacker captures a valid auth token and resubmits it later. | High | Backend `ChallengeNonceStore` ensures each challenge is used exactly once and expires quickly. |
| **Elevation of Privilege** | Session Fixation or CSRF. | High | Spring Security rotates JSESSIONID on login. CSRF tokens are required for stateful web apps. |
| **Elevation of Privilege** | Man-in-the-Middle (MitM) Attack. | High | The challenge nonce is signed *along with the Origin URL*. If an attacker proxies the site on a different domain, the signature will fail validation against the configured expected Origin on the backend. |

## What NOT to store
*   **NEVER** attempt to capture or store the user's PIN. (Web eID prevents this natively, but do not try to build custom UI for it).
*   **NEVER** store private keys. (They are hardware-bound).

## Trust Boundaries
The fundamental trust boundary is between the **Backend Server** (which you control) and the **Client Environment** (Browser + OS + Smart Card, which you DO NOT control).
*   *Assume the client environment is compromised.*
*   Therefore, all security assertions (signature verification, certificate validation, nonce checking, origin checking) MUST happen on the Backend Server. You cannot trust validation performed in React or JavaScript.
