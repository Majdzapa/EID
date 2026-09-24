package com.example.webeid.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "signatures")
public class SignatureRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "signer_id", nullable = false)
    private AppUser signer;

    @ManyToOne
    @JoinColumn(name = "document_id")
    private Document document;

    @Column(nullable = false, length = 512)
    private String signedHash;

    @Column(nullable = false, length = 4096)
    private String signatureBase64;

    @Column(nullable = false)
    private String algorithm;

    @Column(nullable = false, length = 8192)
    private String signingCertificate;

    @Column(nullable = false)
    private String signatureType;  // "DOCUMENT" or "HASH"

    @CreationTimestamp
    private LocalDateTime signedAt;

    public SignatureRecord() {}

    public Long getId() { return id; }
    public AppUser getSigner() { return signer; }
    public void setSigner(AppUser signer) { this.signer = signer; }
    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }
    public String getSignedHash() { return signedHash; }
    public void setSignedHash(String signedHash) { this.signedHash = signedHash; }
    public String getSignatureBase64() { return signatureBase64; }
    public void setSignatureBase64(String signatureBase64) { this.signatureBase64 = signatureBase64; }
    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }
    public String getSigningCertificate() { return signingCertificate; }
    public void setSigningCertificate(String signingCertificate) { this.signingCertificate = signingCertificate; }
    public String getSignatureType() { return signatureType; }
    public void setSignatureType(String signatureType) { this.signatureType = signatureType; }
    public LocalDateTime getSignedAt() { return signedAt; }
}
