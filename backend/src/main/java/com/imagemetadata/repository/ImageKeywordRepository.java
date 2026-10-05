package com.imagemetadata.repository;

import com.imagemetadata.model.ImageKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ImageKeywordRepository extends JpaRepository<ImageKeyword, Long> {

    List<ImageKeyword> findByImageJobIdOrderByPositionAsc(UUID imageJobId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByImageJobId(UUID imageJobId);
}
