package com.example.webeid.dto;

import lombok.Data;

@Data
public class SignRequest {
    private String unverifiedCertificate;
    private String signatureAlgorithm;
    private String signature;
    
    public String getUnverifiedCertificate() { return unverifiedCertificate; }
    public void setUnverifiedCertificate(String unverifiedCertificate) { this.unverifiedCertificate = unverifiedCertificate; }
    public String getSignatureAlgorithm() { return signatureAlgorithm; }
    public void setSignatureAlgorithm(String signatureAlgorithm) { this.signatureAlgorithm = signatureAlgorithm; }
    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
}
