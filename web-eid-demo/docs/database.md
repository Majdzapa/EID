# Database Design

## Overview

A robust Web eID integration requires storing user identities mapping to certificates, audit logs for security events, and tracking document signatures.

## Entities

### 1. `users`
Stores the core identity extracted from the eID certificate upon first successful login.
*   `id` (UUID, Primary Key)
*   `personal_code` (String, Unique) - E.g., the national ID number extracted from the `SerialNumber` attribute of the certificate subject. This is the true unique identifier.
*   `given_name` (String)
*   `surname` (String)
*   `created_at` (Timestamp)
*   `last_login_at` (Timestamp)

### 2. `audit_events`
Crucial for security and compliance (GDPR, etc.). Records every authentication and signing attempt.
*   `id` (UUID, Primary Key)
*   `user_id` (UUID, Foreign Key nullable for failed logins)
*   `event_type` (Enum: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `SIGN_SUCCESS`, `SIGN_FAILED`)
*   `certificate_serial` (String) - Serial number of the certificate used.
*   `certificate_fingerprint` (String) - SHA-256 fingerprint of the certificate.
*   `ip_address` (String)
*   `failure_reason` (String, nullable) - E.g., "OCSP_REVOKED", "INVALID_SIGNATURE".
*   `timestamp` (Timestamp)

### 3. `documents`
Tracks documents uploaded for signing.
*   `id` (UUID, Primary Key)
*   `file_name` (String)
*   `status` (Enum: `PENDING`, `SIGNED`, `FAILED`)
*   `created_at` (Timestamp)

### 4. `signatures`
Maps a user to a signed document.
*   `id` (UUID, Primary Key)
*   `document_id` (UUID, Foreign Key)
*   `user_id` (UUID, Foreign Key)
*   `certificate_serial` (String)
*   `timestamp` (Timestamp)

## GDPR Considerations
*   **Data Minimization**: Do not store the entire raw X.509 certificate in the database unless legally required for a specific business process. Extract only what is needed (Name, ID Code).
*   **Audit Logs**: Audit logs contain PII (IP addresses, Personal Codes). Ensure they are subject to retention policies and access controls.

## What is NOT Stored
*   **PINs**: Never touch the backend.
*   **Challenge Nonces**: These should be stored in transient, short-lived memory (like Redis with a 5-minute TTL or an in-memory cache like Caffeine), NOT in a persistent relational database.
