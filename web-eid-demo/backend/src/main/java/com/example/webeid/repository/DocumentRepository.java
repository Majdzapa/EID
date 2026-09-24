package com.example.webeid.repository;

import com.example.webeid.model.Document;
import com.example.webeid.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwner(AppUser owner);
    List<Document> findByOwnerUsername(String username);
}
