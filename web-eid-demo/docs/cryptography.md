# Cryptographic Details

## Overview

Web eID relies heavily on industry-standard public-key cryptography. Understanding the underlying algorithms is crucial for maintaining security.

## 1. Hashing

Web eID does not use obsolete hashing algorithms like MD5 or SHA-1.
*   **Supported**: SHA-256, SHA-384, SHA-512.
*   **Usage in Authentication**: The challenge nonce is combined with the origin URL, and this combined string is hashed (typically SHA-256) before being signed by the card.
*   **Usage in Signing**: The backend calculates the hash (e.g., SHA-512) of the PDF or XML document. Only this hash is sent to the smart card, ensuring privacy and speed.

## 2. Asymmetric Cryptography (Public-Key)

The smart card holds private keys that correspond to public certificates.
Depending on the specific country's eID card generation, the underlying algorithm is usually one of:

*   **RSA (Rivest–Shamir–Adleman)**: Older cards often use RSA with 2048-bit keys.
    *   **Padding Scheme**: RSASSA-PKCS1-v1_5 is common, but modern implementations strongly prefer **RSA-PSS** (Probabilistic Signature Scheme) because it provides a mathematical proof of security. Web eID supports both.
*   **ECC (Elliptic Curve Cryptography)**: Newer cards increasingly use ECC (e.g., NIST P-384 curve) because it provides equivalent security to RSA with significantly smaller key sizes, making operations on the smart card much faster.
    *   **Algorithm**: ECDSA (Elliptic Curve Digital Signature Algorithm).

## 3. Container Formats

For digital document signing, the raw signature produced by the smart card is not enough. It must be packaged so it can be verified years later.

*   **ASiC-E (Associated Signature Containers Extended)**: An ETSI standard (EN 319 162). It is essentially a ZIP file containing the original documents and an `META-INF/signatures.xml` file.
*   **BDOC**: The Estonian specific profile of ASiC-E.
*   **XAdES (XML Advanced Electronic Signatures)**: The format used *inside* the ASiC container for the signature itself.
*   **PAdES (PDF Advanced Electronic Signatures)**: An alternative standard used when signing PDF files directly. Web eID can support this if the backend (e.g., DigiDoc4j) is configured to output PAdES instead of ASiC.

## 4. Hardware Security (PKCS#11 / PC/SC)

*   **PC/SC**: The standard API for integrating smart card readers into operating systems.
*   **PKCS#11**: The standard cryptographic token interface. The Web eID native app uses these lower-level APIs to communicate securely with the smart card driver, ensuring the private key is never exposed to the OS memory space.

### References
*   [ETSI EN 319 162 (ASiC)](https://www.etsi.org/deliver/etsi_en/319100_319199/31916201/01.01.01_60/en_31916201v010101p.pdf)
