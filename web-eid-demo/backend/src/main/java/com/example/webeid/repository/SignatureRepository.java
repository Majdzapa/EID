package com.example.webeid.repository;

import com.example.webeid.model.SignatureRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SignatureRepository extends JpaRepository<SignatureRecord, Long> {
    List<SignatureRecord> findBySignerUsername(String username);
    List<SignatureRecord> findByDocumentId(Long documentId);
}
