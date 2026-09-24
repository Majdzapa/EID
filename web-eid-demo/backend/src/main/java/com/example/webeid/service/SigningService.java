package com.example.webeid.service;

import com.example.webeid.model.AppUser;
import com.example.webeid.model.Document;
import com.example.webeid.model.SignatureRecord;
import com.example.webeid.repository.DocumentRepository;
import com.example.webeid.repository.SignatureRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SigningService {

    private final DocumentRepository documentRepository;
    private final SignatureRepository signatureRepository;

    // Temp in-memory store: documentId -> hash being signed  
    // (keeps track of active sign sessions)
    private final Map<Long, String> pendingSignSessions = new ConcurrentHashMap<>();

    public SigningService(DocumentRepository documentRepository, SignatureRepository signatureRepository) {
        this.documentRepository = documentRepository;
        this.signatureRepository = signatureRepository;
    }

    // ─── Document operations ──────────────────────────────────────────────────

    @Transactional
    public Document uploadDocument(String fileName, String mimeType, byte[] content, AppUser owner) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-384");
        String hash = Base64.getEncoder().encodeToString(digest.digest(content));

        Document doc = new Document();
        doc.setFileName(fileName);
        doc.setMimeType(mimeType);
        doc.setContent(content);
        doc.setContentHash(hash);
        doc.setStatus("PENDING");
        doc.setOwner(owner);
        return documentRepository.save(doc);
    }

    /** Prepare for signing: returns the hash to be signed by the smart card */
    public String prepareDocumentSign(Long documentId) {
        Document doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));
        pendingSignSessions.put(documentId, doc.getContentHash());
        return doc.getContentHash();
    }

    /** Finalize document signing: verify and store the signature */
    @Transactional
    public SignatureRecord finalizeDocumentSign(Long documentId, String signatureBase64,
                                                String algorithm, String certBase64,
                                                AppUser signer) {
        Document doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

        String expectedHash = pendingSignSessions.remove(documentId);
        if (expectedHash == null) {
            throw new RuntimeException("No active signing session for document " + documentId);
        }

        // Store the signature record
        SignatureRecord sig = new SignatureRecord();
        sig.setDocument(doc);
        sig.setSigner(signer);
        sig.setSignedHash(expectedHash);
        sig.setSignatureBase64(signatureBase64);
        sig.setAlgorithm(algorithm);
        sig.setSigningCertificate(certBase64);
        sig.setSignatureType("DOCUMENT");
        signatureRepository.save(sig);

        // Mark document as signed
        doc.setStatus("SIGNED");
        documentRepository.save(doc);

        return sig;
    }

    // ─── Hash signing ─────────────────────────────────────────────────────────

    /**
     * Sign an arbitrary hash string supplied by the user.
     * The hash must be Base64-encoded (as the Web eID extension expects).
     */
    @Transactional
    public SignatureRecord finalizeHashSign(String hashBase64, String signatureBase64,
                                            String algorithm, String certBase64,
                                            AppUser signer) {
        SignatureRecord sig = new SignatureRecord();
        sig.setDocument(null);  // No document — this is a raw hash signature
        sig.setSigner(signer);
        sig.setSignedHash(hashBase64);
        sig.setSignatureBase64(signatureBase64);
        sig.setAlgorithm(algorithm);
        sig.setSigningCertificate(certBase64);
        sig.setSignatureType("HASH");
        return signatureRepository.save(sig);
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    public List<Document> getDocumentsForUser(String username) {
        return documentRepository.findByOwnerUsername(username);
    }

    public List<Document> getAllDocuments() {
        return documentRepository.findAll();
    }

    public List<SignatureRecord> getSignaturesForUser(String username) {
        return signatureRepository.findBySignerUsername(username);
    }

    public List<SignatureRecord> getSignaturesForDocument(Long documentId) {
        return signatureRepository.findByDocumentId(documentId);
    }
}
