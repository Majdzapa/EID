package com.example.webeid.controller;

import com.example.webeid.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Handles classic username + password login.
 * Available in BOTH demo and prod profiles.
 *
 * POST /api/auth/password/login
 * Body: { "username": "admin", "password": "admin" }
 */
@RestController
@RequestMapping("/api/auth/password")
public class UserPasswordAuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public UserPasswordAuthController(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> body) {

        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "username and password are required"));
        }

        try {
            Authentication authRequest =
                    UsernamePasswordAuthenticationToken.unauthenticated(username, password);

            Authentication authenticated = authenticationManager.authenticate(authRequest);

            // Generate JWT
            UserDetails userDetails = (UserDetails) authenticated.getPrincipal();
            String jwtToken = jwtService.generateToken(userDetails);

            return ResponseEntity.ok(Map.of(
                    "status", "AUTHENTICATED",
                    "user", authenticated.getName(),
                    "loginMethod", "password",
                    "token", jwtToken
            ));

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid username or password"));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Authentication error: " + e.getMessage()));
        }
    }
}
