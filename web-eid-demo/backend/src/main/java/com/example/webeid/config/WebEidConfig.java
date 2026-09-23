package com.example.webeid.config;

import eu.webeid.security.challenge.ChallengeNonceStore;
import eu.webeid.security.challenge.ChallengeNonce;
import eu.webeid.security.challenge.ChallengeNonceGenerator;
import eu.webeid.security.challenge.ChallengeNonceGeneratorBuilder;
import eu.webeid.security.validator.AuthTokenValidator;
import eu.webeid.security.validator.AuthTokenValidatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.annotation.SessionScope;

import java.net.URI;
import java.net.URISyntaxException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class WebEidConfig {

    // IMPORTANT: For production, this MUST match your public-facing HTTPS domain.
    // Web eID requires HTTPS.
    private static final String ORIGIN_URL = "https://localhost:5173";

    @Bean
    public AuthTokenValidator authTokenValidator() throws Exception {
        // Load the self-signed demo certificate as the trusted CA.
        // In production, use real national eID Root CA certificates.
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        X509Certificate trustedCert = (X509Certificate) cf.generateCertificate(
            new org.springframework.core.io.ClassPathResource("certs/test-cert.pem").getInputStream()
        );
        return new AuthTokenValidatorBuilder()
                .withSiteOrigin(new URI(ORIGIN_URL))
                .withTrustedCertificateAuthorities(trustedCert)
                .withoutUserCertificateRevocationCheckWithOcsp() // DEMO ONLY
                .build();
    }

    @Bean
    public ChallengeNonceGenerator challengeNonceGenerator(ChallengeNonceStore challengeNonceStore) {
        try {
            return new ChallengeNonceGeneratorBuilder()
                    .withChallengeNonceStore(challengeNonceStore)
                    .withNonceTtl(Duration.ofMinutes(5))
                    .build();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Session-scoped store ensures nonces are tied to a specific user's browser session
     * to prevent forged login attacks (CSRF).
     */
    @Bean
    @SessionScope
    public ChallengeNonceStore challengeNonceStore() {
        return new SessionBackedChallengeNonceStore();
    }

    public static class SessionBackedChallengeNonceStore implements ChallengeNonceStore {
        private ChallengeNonce challengeNonce;
        private ZonedDateTime expiryTime;

        @Override
        public void put(ChallengeNonce nonce) {
            this.challengeNonce = nonce;
            this.expiryTime = ZonedDateTime.now().plusMinutes(5);
        }

        @Override
        public ChallengeNonce getAndRemoveImpl() {
            if (challengeNonce == null || ZonedDateTime.now().isAfter(expiryTime)) {
                return null;
            }
            ChallengeNonce nonce = this.challengeNonce;
            this.challengeNonce = null; // Ensure single use
            return nonce;
        }
    }
}
