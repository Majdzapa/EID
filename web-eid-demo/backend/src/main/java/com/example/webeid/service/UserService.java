package com.example.webeid.service;

import com.example.webeid.model.AppUser;
import com.example.webeid.model.Role;
import com.example.webeid.repository.AppUserRepository;
import com.example.webeid.repository.RoleRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserService(AppUserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    /** Seed default roles on startup */
    @PostConstruct
    @Transactional
    public void seedRoles() {
        for (String roleName : List.of("ROLE_USER", "ROLE_ADMIN", "ROLE_SIGNER")) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(new Role(roleName));
            }
        }
    }

    /**
     * Find or create an AppUser from eID certificate data.
     * On first login, the user is created with ROLE_USER and ROLE_SIGNER.
     */
    @Transactional
    public AppUser findOrCreateEidUser(String displayName, String personalCode) {
        return userRepository.findByPersonalCode(personalCode).orElseGet(() -> {
            AppUser user = new AppUser(displayName, personalCode, "EID");
            Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("ROLE_USER not found"));
            Role signerRole = roleRepository.findByName("ROLE_SIGNER")
                .orElseThrow(() -> new RuntimeException("ROLE_SIGNER not found"));
            user.getRoles().add(userRole);
            user.getRoles().add(signerRole);
            return userRepository.save(user);
        });
    }

    public AppUser findByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    public List<AppUser> findAll() {
        return userRepository.findAll();
    }
}
