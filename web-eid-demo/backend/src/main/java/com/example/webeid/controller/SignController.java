package com.example.webeid.controller;

import com.example.webeid.model.AppUser;
import com.example.webeid.model.Document;
import com.example.webeid.model.SignatureRecord;
import com.example.webeid.service.SigningService;
import com.example.webeid.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SignController {

    private final SigningService signingService;
    private final UserService userService;

    public SignController(SigningService signingService, UserService userService) {
        this.signingService = signingService;
        this.userService = userService;
    }

    // ─── Document upload ──────────────────────────────────────────────────────

    /**
     * POST /api/documents/upload
     * Multipart file upload. Returns created document with its hash.
     */
    @PostMapping("/documents/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        try {
            AppUser owner = userService.findByUsername(auth.getName());
            Document doc = signingService.uploadDocument(
                file.getOriginalFilename(),
                file.getContentType(),
                file.getBytes(),
                owner
            );
            return ResponseEntity.ok(Map.of(
                "id",          doc.getId(),
                "fileName",    doc.getFileName(),
                "contentHash", doc.getContentHash(),
                "status",      doc.getStatus()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Document listing ─────────────────────────────────────────────────────

    @GetMapping("/documents")
    public ResponseEntity<?> listDocuments(Authentication auth) {
        List<Document> docs = signingService.getDocumentsForUser(auth.getName());
        return ResponseEntity.ok(docs.stream().map(d -> Map.of(
            "id",        d.getId(),
            "fileName",  d.getFileName(),
            "mimeType",  d.getMimeType(),
            "hash",      d.getContentHash(),
            "status",    d.getStatus(),
            "createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : ""
        )).toList());
    }

    // ─── Document signing — prepare ───────────────────────────────────────────

    /**
     * GET /api/documents/{id}/prepare-sign
     * Returns the hash of the document for the Web eID extension to sign.
     */
    @GetMapping("/documents/{id}/prepare-sign")
    public ResponseEntity<?> prepareDocumentSign(@PathVariable Long id) {
        try {
            String hash = signingService.prepareDocumentSign(id);
            return ResponseEntity.ok(Map.of(
                "documentId",    id,
                "hashToSign",    hash,
                "hashAlgorithm", "SHA-384"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Document signing — finalize ──────────────────────────────────────────

    /**
     * POST /api/documents/{id}/sign
     * Body: { "signature": "<base64>", "algorithm": "SHA-384withRSA", "certificate": "<base64>" }
     */
    @PostMapping("/documents/{id}/sign")
    public ResponseEntity<?> finalizeDocumentSign(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        try {
            AppUser signer = userService.findByUsername(auth.getName());
            SignatureRecord sig = signingService.finalizeDocumentSign(
                id,
                body.get("signature"),
                body.get("algorithm"),
                body.get("certificate"),
                signer
            );
            return ResponseEntity.ok(Map.of(
                "status",      "SIGNED",
                "signatureId", sig.getId(),
                "documentId",  id,
                "algorithm",   sig.getAlgorithm(),
                "signedAt",    sig.getSignedAt() != null ? sig.getSignedAt().toString() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Hash signing ─────────────────────────────────────────────────────────

    /**
     * POST /api/sign/hash
     * Allows the user to sign an arbitrary hash (Base64-encoded) via their smart card.
     * Body: {
     *   "hashToSign":  "<base64-encoded hash string the user wants to sign>",
     *   "signature":   "<base64 signature returned by web-eid>",
     *   "algorithm":   "SHA-384withRSA",
     *   "certificate": "<base64 DER signing certificate>"
     * }
     */
    @PostMapping("/sign/hash")
    public ResponseEntity<?> signHash(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        try {
            AppUser signer = userService.findByUsername(auth.getName());
            SignatureRecord sig = signingService.finalizeHashSign(
                body.get("hashToSign"),
                body.get("signature"),
                body.get("algorithm"),
                body.get("certificate"),
                signer
            );
            return ResponseEntity.ok(Map.of(
                "status",      "SIGNED",
                "signatureId", sig.getId(),
                "signedHash",  sig.getSignedHash(),
                "algorithm",   sig.getAlgorithm(),
                "signedAt",    sig.getSignedAt() != null ? sig.getSignedAt().toString() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Signature history ────────────────────────────────────────────────────

    @GetMapping("/signatures")
    public ResponseEntity<?> mySignatures(Authentication auth) {
        List<SignatureRecord> sigs = signingService.getSignaturesForUser(auth.getName());
        return ResponseEntity.ok(sigs.stream().map(s -> Map.of(
            "id",            s.getId(),
            "type",          s.getSignatureType(),
            "signedHash",    s.getSignedHash(),
            "algorithm",     s.getAlgorithm(),
            "documentId",    s.getDocument() != null ? s.getDocument().getId() : null,
            "documentName",  s.getDocument() != null ? s.getDocument().getFileName() : "N/A (hash)",
            "signedAt",      s.getSignedAt() != null ? s.getSignedAt().toString() : ""
        )).toList());
    }

    @GetMapping("/documents/{id}/signatures")
    public ResponseEntity<?> documentSignatures(@PathVariable Long id) {
        List<SignatureRecord> sigs = signingService.getSignaturesForDocument(id);
        return ResponseEntity.ok(sigs.stream().map(s -> Map.of(
            "id",        s.getId(),
            "signer",    s.getSigner().getUsername(),
            "algorithm", s.getAlgorithm(),
            "signedAt",  s.getSignedAt() != null ? s.getSignedAt().toString() : ""
        )).toList());
    }
}
