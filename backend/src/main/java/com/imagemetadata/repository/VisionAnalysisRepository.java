package com.imagemetadata.repository;

import com.imagemetadata.model.VisionAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisionAnalysisRepository extends JpaRepository<VisionAnalysis, Long> {

    Optional<VisionAnalysis> findByImageJobId(UUID imageJobId);

    @Modifying
    void deleteByImageJobId(UUID imageJobId);
}
