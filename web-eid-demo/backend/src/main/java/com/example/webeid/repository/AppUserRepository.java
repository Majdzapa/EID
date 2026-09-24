package com.example.webeid.repository;

import com.example.webeid.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByPersonalCode(String personalCode);
    boolean existsByUsername(String username);
}
