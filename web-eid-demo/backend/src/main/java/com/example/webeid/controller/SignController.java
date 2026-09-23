package com.example.webeid.controller;

import com.example.webeid.dto.SignPrepareRequest;
import com.example.webeid.dto.SignPrepareResponse;
import com.example.webeid.dto.SignRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/documents")
public class SignController {

    // Simple in-memory store for demo. In production, use database and actual DigiDoc4j ContainerBuilder.
    private final ConcurrentHashMap<String, byte[]> pendingDocuments = new ConcurrentHashMap<>();

    @PostMapping("/prepare")
    public ResponseEntity<SignPrepareResponse> prepareSignature(@RequestBody SignPrepareRequest request) {
        try {
            byte[] fileBytes = Base64.getDecoder().decode(request.getFileContentBase64());
            
            // Generate a simple SHA-384 hash of the file for the demo.
            // In production with digidoc4j:
            // 1. ContainerBuilder builder = ContainerBuilder.aContainer(Container.DocumentType.ASICE);
            // 2. builder.withDataFile(new DataFile(fileBytes, request.getFileName(), "application/pdf"));
            // 3. Container container = builder.build();
            // 4. DataToSign dataToSign = SignatureBuilder.aSignature(container).withSigningCertificate(cert).buildDataToSign();
            // 5. byte[] hash = dataToSign.getDataToSign();
            
            MessageDigest digest = MessageDigest.getInstance("SHA-384");
            byte[] hashBytes = digest.digest(fileBytes);
            String documentHash = Base64.getEncoder().encodeToString(hashBytes);
            
            // Store the document temporarily
            String docId = UUID.randomUUID().toString();
            pendingDocuments.put(docId, fileBytes);
            
            return ResponseEntity.ok(new SignPrepareResponse(documentHash, "SHA-384"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/sign")
    public ResponseEntity<?> finalizeSignature(@RequestBody SignRequest request) {
        try {
            // In production with digidoc4j:
            // 1. Signature signature = dataToSign.finalize(request.getSignature());
            // 2. container.addSignature(signature);
            // 3. container.saveAsFile("signed-document.asice");
            
            // For this demo, we just simulate a successful signing response
            // since we don't have a real smart card to generate a valid signature
            // against the digidoc4j PKI validation.
            
            System.out.println("Received signature from Web eID!");
            System.out.println("Algorithm: " + request.getSignatureAlgorithm());
            
            return ResponseEntity.ok("{\"status\": \"SIGNED_SUCCESSFULLY\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
}
