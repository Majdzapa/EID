package com.example.webeid.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public endpoint that tells the frontend which profile is active.
 * The frontend uses this to show/hide the Demo login option.
 */
@RestController
@RequestMapping("/api/info")
public class AppInfoController {

    @Value("${app.profile:demo}")
    private String profile;

    @Value("${app.demo-mode-enabled:false}")
    private boolean demoModeEnabled;

    @GetMapping
    public ResponseEntity<?> info() {
        return ResponseEntity.ok(Map.of(
                "profile", profile,
                "demoModeEnabled", demoModeEnabled
        ));
    }
}
