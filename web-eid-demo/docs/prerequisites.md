# Prerequisites

To run this demo and successfully perform Web eID authentication and signing, you need the following hardware and software.

## Hardware

1.  **Smart Card / eID**: A supported European Union electronic identity card (e.g., Estonian ID-card, Latvian eID, etc.). Required because cryptographic operations and private keys are hardware-bound to the card.
2.  **Smart Card Reader**: A compatible USB or built-in smart card reader (PC/SC compliant). NFC readers are also supported by the middleware if the card has NFC capabilities.

## Software - End User (Client)

The end user must have the following installed on their operating system. If they don't, the React application will prompt them to install the Web eID extension.

1.  **Operating System**: Windows, macOS, or Linux.
2.  **Browser**: Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari.
3.  **eID Middleware**: The official eID software for the specific country (e.g., [Open-EID](https://www.id.ee/en/) for Estonia). This provides the PC/SC drivers. *Mandatory*.
4.  **Web eID Native App**: The native application that communicates with the smart card. Download from [id.ee](https://www.id.ee/en/article/install-id-software/). *Mandatory*.
5.  **Web eID Browser Extension**: Connects the browser to the native app. Prompts for installation usually appear automatically in the browser during the first use of Web eID. *Mandatory*.

## Software - Development Environment (Backend & Frontend)

To compile and run this demo application locally:

1.  **Java 21**: Required for the Spring Boot 3.x backend. *Mandatory*. ([Adoptium Temurin](https://adoptium.net/))
2.  **Maven**: For building the Java project. *Mandatory*. ([Maven](https://maven.apache.org/))
3.  **Node.js (v18+)**: Required for running the React frontend build tools (Vite). *Mandatory*. ([Node.js](https://nodejs.org/))
4.  **npm or yarn**: Package managers for the frontend. *Mandatory*.
5.  **Spring Boot 3.x**: Handled via Maven dependencies. *Mandatory*.
6.  **React (v18+)**: Handled via npm dependencies. *Mandatory*.
7.  **Database**:
    *   **H2 (In-Memory)**: Configured by default for the demo for immediate setup without dependencies.
    *   **PostgreSQL**: Optional, configuration provided via `docker-compose.yml`.

### References
*   [Web eID Deployment & Installation](https://github.com/web-eid/web-eid-system-architecture-doc#deployment)
