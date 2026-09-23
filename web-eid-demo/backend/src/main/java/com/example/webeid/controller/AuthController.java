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

import java.security.cert.X509Certificate;
import java.util.Collections;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final ChallengeNonceGenerator nonceGenerator;
    private final AuthTokenValidator authTokenValidator;
    private final ChallengeNonceStore challengeNonceStore;

    @Autowired
    public AuthController(ChallengeNonceGenerator nonceGenerator, AuthTokenValidator authTokenValidator, ChallengeNonceStore challengeNonceStore) {
        this.nonceGenerator = nonceGenerator;
        this.authTokenValidator = authTokenValidator;
        this.challengeNonceStore = challengeNonceStore;
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
            
            // Log user in to Spring Security
            // For the demo, we just use the Subject DN as the username
            User userDetails = new User(subjectDn, "", Collections.emptyList());
            
            UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            
            SecurityContextHolder.getContext().setAuthentication(authentication);

            return ResponseEntity.ok().body("{\"status\": \"AUTHENTICATED\", \"user\": \"" + subjectDn + "\"}");
            
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
}
