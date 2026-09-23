# Web eID — Extension & Native Application Setup Guide

This document provides step-by-step configuration instructions for all required Web eID software components. Both the **browser extension** and the **native application** must be installed and working for real smart card authentication to function.

---

## Overview of Required Components

```
┌─────────────────────────────────────────────────────────┐
│                   USER'S MACHINE                        │
│                                                         │
│  ┌───────────────┐      ┌──────────────────────────┐   │
│  │   Browser     │      │  Web eID Native App      │   │
│  │  Extension    │◄────►│  (web-eid-app)           │   │
│  │  (web-eid)    │      │  Communicates via        │   │
│  └───────────────┘      │  Native Messaging        │   │
│                         └──────────┬───────────────┘   │
│                                    │ PC/SC API          │
│                         ┌──────────▼───────────────┐   │
│                         │  Smart Card Reader        │   │
│                         │  (USB / NFC)              │   │
│                         └──────────┬───────────────┘   │
│                                    │                    │
│                         ┌──────────▼───────────────┐   │
│                         │  eID Smart Card           │   │
│                         │  (Private Key + Cert)     │   │
│                         └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Both components communicate via **Native Messaging** — a secure browser API that allows extensions to talk to local OS-level applications without exposing data to the network.

---

## Part 1 — Smart Card Reader & Card Drivers

Before installing Web eID software, ensure your hardware is recognized by the OS.

### 1.1 Supported Hardware

- Any PC/SC-compatible USB smart card reader
- NFC readers (for contactless eID cards)
- Common brands: Gemalto, HID, ACS, SCM Microsystems, Identiv

### 1.2 Driver Installation

| OS | Action Required |
|---|---|
| **Windows** | Drivers are typically auto-installed via Windows Update. Verify in Device Manager. |
| **macOS** | PC/SC support is built into macOS (`pcscd` daemon). Most readers work plug-and-play. |
| **Linux (Ubuntu/Debian)** | Install `pcscd` and `libccid`: `sudo apt install pcscd libccid pcsc-tools` |
| **Linux (Fedora/RHEL)** | `sudo dnf install pcsc-lite ccid pcsc-tools` |

### 1.3 Verify Card Reader is Recognized

```bash
# Linux / macOS — check connected readers
pcsc_scan

# Windows — open Device Manager and look under "Smart card readers"
```

Expected output (Linux/macOS):
```
Scanning present readers...
0: ACS ACR122U PICC Interface 00 00
```

If no reader appears, the USB driver or `pcscd` daemon is not running:
```bash
# Start pcscd daemon (Linux)
sudo systemctl start pcscd
sudo systemctl enable pcscd
```

---

## Part 2 — Web eID Native Application

The native application (`web-eid-app`) runs on your operating system and bridges the browser extension to the smart card reader via PC/SC.

### 2.1 Download

Official releases: **https://github.com/web-eid/web-eid-app/releases**

Download the appropriate installer for your platform:

| Platform | File to Download |
|---|---|
| Windows 10/11 (64-bit) | `web-eid_X.Y.Z.msi` |
| macOS 11+ (Intel & Apple Silicon) | `web-eid_X.Y.Z.pkg` |
| Ubuntu 20.04 / 22.04 | `web-eid_X.Y.Z_amd64.deb` |
| Fedora / RHEL | `web-eid_X.Y.Z.x86_64.rpm` |

> **Always download from the official GitHub releases page.** Never install from third-party sources.

### 2.2 Installation — Windows

1. Download `web-eid_X.Y.Z.msi`
2. Right-click → **Run as administrator**
3. Follow the setup wizard (accept the license, click Next → Install)
4. On completion, the native app registers itself with Windows Registry for Native Messaging
5. No manual startup is required — the browser extension launches it on demand

**Verify installation:**
```
Start → Apps → search "Web eID" → should appear
Registry key should exist at:
HKLM\SOFTWARE\Google\Chrome\NativeMessagingHosts\eu.webeid.webeid
```

### 2.3 Installation — macOS

1. Download `web-eid_X.Y.Z.pkg`
2. Double-click to open
3. macOS may warn "unidentified developer" — go to **System Settings → Privacy & Security → Open Anyway**
4. Follow the install wizard
5. The installer places the app in `/Applications/Web eID.app` and registers the Native Messaging manifest

**Verify installation:**
```bash
# Check that the native messaging manifest is registered
cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/eu.webeid.webeid.json
# Should output a valid JSON file pointing to the app binary
```

**macOS Gatekeeper (Apple Silicon):**

If you see "web-eid-app cannot be opened because Apple cannot check it for malicious software":
```bash
sudo xattr -rd com.apple.quarantine /Applications/Web\ eID.app
```

### 2.4 Installation — Ubuntu / Debian

```bash
# 1. Add the official repository (recommended for auto-updates)
sudo apt install curl gpg
curl -fsSL https://installer.id.ee/media/install-scripts/ria-repository.gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/ria-repository.gpg

echo "deb [signed-by=/usr/share/keyrings/ria-repository.gpg] \
  https://installer.id.ee/media/ubuntu/ $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/ria-repository.list

sudo apt update

# 2. Install the package
sudo apt install web-eid

# 3. Or manual install from the downloaded .deb
sudo dpkg -i web-eid_X.Y.Z_amd64.deb
sudo apt-get install -f   # fix any dependency issues
```

### 2.5 Installation — Fedora / RHEL

```bash
# 1. Add the official RIA repository
sudo dnf config-manager --add-repo \
  https://installer.id.ee/media/fedora/ria-repository.repo

# 2. Install
sudo dnf install web-eid

# 3. Or manual install from .rpm
sudo rpm -i web-eid_X.Y.Z.x86_64.rpm
```

### 2.6 Verify the Native Application

```bash
# Run the version check (all platforms — find app binary first)

# macOS
/Applications/Web\ eID.app/Contents/MacOS/web-eid-app --version

# Linux
web-eid-app --version
```

Expected output:
```
web-eid-app 2.x.x
```

---

## Part 3 — Web eID Browser Extension

The extension intercepts JavaScript calls from the web page and forwards them to the native application via Native Messaging.

### 3.1 Supported Browsers

| Browser | Extension Link |
|---|---|
| **Google Chrome** | [Chrome Web Store](https://chrome.google.com/webstore/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic) |
| **Mozilla Firefox** | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/web-eid/) |
| **Microsoft Edge** | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/web-eid/ckljmjlokbfglbdgihkjocbilomamgoh) |
| **Safari (macOS)** | Included with the macOS `.pkg` installer |
| **Opera** | Install via Chrome Web Store (Enable "Allow extensions from other stores") |

### 3.2 Installation — Chrome

1. Open Chrome → navigate to the [Chrome Web Store listing](https://chrome.google.com/webstore/detail/web-eid/ncibgoaomkmdpilpocfeponihegamlic)
2. Click **"Add to Chrome"**
3. Click **"Add extension"** in the confirmation dialog
4. The Web eID icon (🔐) appears in the toolbar

**Via command line (enterprise deployment):**
```bash
# The extension ID is: ncibgoaomkmdpilpocfeponihegamlic
# Force-install via Group Policy or managed Chrome settings
```

### 3.3 Installation — Firefox

1. Open Firefox → navigate to the [Firefox Add-ons listing](https://addons.mozilla.org/en-US/firefox/addon/web-eid/)
2. Click **"Add to Firefox"**
3. Click **"Add"** in the permission dialog
4. Optionally check "Run in Private Windows" if needed

### 3.4 Installation — Edge

1. Open Edge → navigate to the [Edge Add-ons listing](https://microsoftedge.microsoft.com/addons/detail/web-eid/ckljmjlokbfglbdgihkjocbilomamgoh)
2. Click **"Get"** → **"Add Extension"**

### 3.5 Verify Extension is Active

After installing, open the browser extension management page:

- **Chrome**: `chrome://extensions/` → Search "Web eID" → Status should be **Enabled**
- **Firefox**: `about:addons` → Extensions → Web eID → **Enabled**
- **Edge**: `edge://extensions/` → Web eID → **On**

**Test the extension works with the native app:**

1. Navigate to the official test page: **https://web-eid.eu**
2. Click **"Authenticate"** or **"Test"**
3. A dialog should appear asking you to insert your smart card (or showing "No smart card reader found" if no reader is connected)

If a dialog appears — the extension is correctly communicating with the native application. ✅

---

## Part 4 — Connecting the Native App to the Extension (Native Messaging)

The browser extension and native app are linked via a **Native Messaging Host manifest** — a JSON file that the browser reads to know where to launch the native process.

The installer automatically creates these manifests. The locations are:

### Chrome Native Messaging Manifest Locations

| OS | Path |
|---|---|
| Windows | `HKLM\SOFTWARE\Google\Chrome\NativeMessagingHosts\eu.webeid.webeid` |
| macOS | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/eu.webeid.webeid.json` |
| Linux | `~/.config/google-chrome/NativeMessagingHosts/eu.webeid.webeid.json` |

### Firefox Native Messaging Manifest Locations

| OS | Path |
|---|---|
| Windows | `HKLM\SOFTWARE\Mozilla\NativeMessagingHosts\eu.webeid.webeid` |
| macOS | `~/Library/Application Support/Mozilla/NativeMessagingHosts/eu.webeid.webeid.json` |
| Linux | `~/.mozilla/native-messaging-hosts/eu.webeid.webeid.json` |

### Expected Manifest File Content

```json
{
  "name": "eu.webeid.webeid",
  "description": "Web eID application",
  "path": "/Applications/Web eID.app/Contents/MacOS/web-eid-app",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://ncibgoaomkmdpilpocfeponihegamlic/"
  ]
}
```

> **If this file is missing** after installation, try reinstalling the native app. The installer is responsible for creating it.

---

## Part 5 — Configuration for Development

### 5.1 Secure Context Requirement

Web eID **only works over HTTPS** (or `localhost`). The browser enforces this as part of the Secure Context policy.

| URL | Works? |
|---|---|
| `https://yourapp.com` | ✅ Yes |
| `http://localhost:5173` | ✅ Yes (localhost is a secure context) |
| `https://localhost:5173` | ✅ Yes |
| `http://192.168.1.100:5173` | ❌ No — HTTP over IP is not a secure context |

### 5.2 Running the Demo Application

This project runs over plain HTTP `localhost` for development, which is supported by browsers as a secure context.

```bash
# Terminal 1 — Start the Spring Boot backend
cd web-eid-demo/backend
mvn spring-boot:run
# Backend available at: http://localhost:8080

# Terminal 2 — Start the React frontend
cd web-eid-demo/frontend
npm run dev
# Frontend available at: http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

### 5.3 Origin Configuration in the Backend

The backend `AuthTokenValidator` must be configured with the **exact** origin of the frontend:

```java
// WebEidConfig.java
return new AuthTokenValidatorBuilder()
    .withSiteOrigin(new URI("https://yourapp.com"))   // PRODUCTION
    // or
    .withSiteOrigin(new URI("http://localhost:5173"))  // Fails — HTTP not allowed by validator
    // Workaround for demo: use https://localhost:5173 and configure Vite HTTPS
    .build();
```

> ⚠️ The `AuthTokenValidatorBuilder` rejects plain HTTP origins (except `localhost`). For the demo, configure Vite with HTTPS if needed, or keep the origin as `https://localhost:5173` when the browser connects over HTTPS.

### 5.4 Configuring HTTPS for Vite (Optional)

To run the frontend over HTTPS locally:

```bash
# Install the Vite HTTPS plugin
npm install --save-dev @vitejs/plugin-basic-ssl
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 5173,
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

The browser will warn about the self-signed certificate — click **"Advanced" → "Proceed to localhost"** to accept it.

---

## Part 6 — Verifying the Complete Stack

Use this checklist before testing with a real smart card:

```
[ ] Smart card reader appears in Device Manager / pcsc_scan
[ ] pcscd daemon is running (Linux: systemctl status pcscd)
[ ] eID card is inserted and blinks/shows activity
[ ] Web eID native app installed (web-eid-app --version succeeds)
[ ] Browser extension installed and ENABLED
[ ] Application is served over HTTPS or localhost
[ ] Backend ORIGIN_URL matches the frontend URL exactly
[ ] Backend trust anchors include the national Root CA certificate
[ ] OCSP check is ENABLED (withoutUserCertificateRevocationCheckWithOcsp() removed)
```

---

## Part 7 — Supported eID Cards

Web eID is designed to work with EU eID smart cards. Tested and officially supported:

| Country | Card | Notes |
|---|---|---|
| 🇪🇪 Estonia | ID card, Digi-ID, Mobile-ID | Reference implementation |
| 🇱🇻 Latvia | eID card | Supported |
| 🇱🇹 Lithuania | eID card | Supported |
| 🇫🇮 Finland | HST card | Supported |
| 🇧🇪 Belgium | eID card | Supported |
| 🇨🇿 Czech Republic | eID card | Supported |
| 🇳🇱 Netherlands | DigiD | Partial support |
| 🇩🇪 Germany | nPA | Via specific drivers |

For the full and updated compatibility list see: **https://www.id.ee/en/article/overview-of-estonian-id-software/**

---

## Part 8 — Updating the Components

### Update the Native Application

- **Windows/macOS**: Download the latest installer from GitHub Releases and run it over the existing installation
- **Linux (apt)**: `sudo apt update && sudo apt upgrade web-eid`
- **Linux (dnf)**: `sudo dnf upgrade web-eid`

### Update the Browser Extension

Extensions update automatically if auto-updates are enabled in the browser. To force update:
- **Chrome**: `chrome://extensions/` → Enable "Developer mode" → **"Update"**
- **Firefox**: `about:addons` → gear icon → "Check for Updates"

---

## Part 9 — Troubleshooting Installation Issues

### Extension shows "Native application is not responding"

1. Verify the native app is installed: `web-eid-app --version`
2. Check the Native Messaging manifest file exists (see Part 4)
3. Check file permissions on the manifest:
   ```bash
   chmod 644 ~/.config/google-chrome/NativeMessagingHosts/eu.webeid.webeid.json
   ```
4. Try re-installing the native application

### "No readers found" or "No card inserted"

1. Verify reader: `pcsc_scan` (Linux/macOS)
2. Try a different USB port
3. Restart the pcscd daemon:
   ```bash
   sudo systemctl restart pcscd
   ```
4. On macOS, try unplugging and re-plugging the reader

### Extension not visible in toolbar (Chrome)

1. Click the puzzle piece icon (Extensions) in the Chrome toolbar
2. Find Web eID → click the pin icon to pin it to the toolbar

### Manifest file was not created after installation (Linux)

Manually create the manifest if the installer missed it:

```bash
mkdir -p ~/.config/google-chrome/NativeMessagingHosts/

cat > ~/.config/google-chrome/NativeMessagingHosts/eu.webeid.webeid.json << 'EOF'
{
  "name": "eu.webeid.webeid",
  "description": "Web eID application",
  "path": "/usr/bin/web-eid-app",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://ncibgoaomkmdpilpocfeponihegamlic/"
  ]
}
EOF
```

---

## References

| Resource | URL |
|---|---|
| Official Web eID project page | https://web-eid.eu |
| Native application releases | https://github.com/web-eid/web-eid-app/releases |
| Browser extension source | https://github.com/web-eid/web-eid-extension |
| JavaScript library | https://github.com/web-eid/web-eid.js |
| Java validation library | https://github.com/web-eid/web-eid-authtoken-validation-java |
| Estonian ID software documentation | https://www.id.ee/en/article/overview-of-estonian-id-software/ |
