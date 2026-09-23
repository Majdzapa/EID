package com.example.webeid.controller;

import com.example.webeid.dto.ChallengeResponse;
import eu.webeid.security.challenge.ChallengeNonce;
import eu.webeid.security.challenge.ChallengeNonceGenerator;
import eu.webeid.security.challenge.ChallengeNonceStore;
import eu.webeid.security.authtoken.WebEidAuthToken;
import eu.webeid.security.validator.AuthTokenValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import com.example.webeid.security.JwtService;

import java.security.cert.X509Certificate;
import java.util.Collections;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final ChallengeNonceGenerator nonceGenerator;
    private final AuthTokenValidator authTokenValidator;
    private final ChallengeNonceStore challengeNonceStore;
    private final JwtService jwtService;

    @Autowired
    public AuthController(ChallengeNonceGenerator nonceGenerator, AuthTokenValidator authTokenValidator, ChallengeNonceStore challengeNonceStore, JwtService jwtService) {
        this.nonceGenerator = nonceGenerator;
        this.authTokenValidator = authTokenValidator;
        this.challengeNonceStore = challengeNonceStore;
        this.jwtService = jwtService;
    }

    @GetMapping("/challenge")
    public ResponseEntity<ChallengeResponse> getChallenge() {
        // Generates the nonce and saves it to the session-backed store configured in WebEidConfig
        ChallengeNonce nonce = nonceGenerator.generateAndStoreNonce();
        return ResponseEntity.ok(new ChallengeResponse(nonce.getBase64EncodedNonce()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody String authTokenStr) {
        try {
            // Validate the Web eID token
            WebEidAuthToken token = authTokenValidator.parse(authTokenStr);
            ChallengeNonce nonce = challengeNonceStore.getAndRemove();
            if (nonce == null) {
                return ResponseEntity.status(401).body("{\"error\": \"Authentication failed: Challenge nonce not found or expired\"}");
            }
            X509Certificate userCertificate = authTokenValidator.validate(token, nonce.getBase64EncodedNonce());

            // Extract identity from certificate
            // In a real application, you would parse the Subject DN (Distinguished Name)
            // Example for Estonian eID: SERIALNUMBER contains the personal ID code.
            String subjectDn = userCertificate.getSubjectX500Principal().getName();
            
            // Extract the common name (CN) to use as username
            String displayName = extractCN(subjectDn);

            // Generate JWT token (simulate DB roles lookup)
            java.util.List<String> roles = java.util.List.of("ROLE_USER");
            String jwtToken = jwtService.generateToken(displayName, roles);

            return ResponseEntity.ok().body("{\"status\": \"AUTHENTICATED\", \"user\": \"" + displayName + "\", \"token\": \"" + jwtToken + "\"}");
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(401).body("{\"error\": \"Authentication failed: " + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            Object principal = auth.getPrincipal();
            String username;
            if (principal instanceof User userDetails) {
                username = userDetails.getUsername();
            } else {
                username = principal.toString();
            }
            return ResponseEntity.ok(java.util.Map.of("username", username));
        }
        return ResponseEntity.status(401).build();
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(jakarta.servlet.http.HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(java.util.Map.of("status", "LOGGED_OUT"));
    }

    private String extractCN(String subjectDn) {
        for (String part : subjectDn.split(",")) {
            String trimmed = part.trim();
            if (trimmed.startsWith("CN=")) {
                return trimmed.substring(3);
            }
        }
        return subjectDn;
    }
}
