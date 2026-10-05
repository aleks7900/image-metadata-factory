package com.imagemetadata.repository;

import com.imagemetadata.model.SafetyFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SafetyFindingRepository extends JpaRepository<SafetyFinding, Long> {

    List<SafetyFinding> findByImageJobId(UUID imageJobId);

    @Modifying
    void deleteByImageJobId(UUID imageJobId);
}
