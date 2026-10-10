package com.imagemetadata.repository;

import com.imagemetadata.model.ImageJob;
import com.imagemetadata.model.JobStatus;
import com.imagemetadata.model.ReviewDecision;
import com.imagemetadata.model.RiskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ImageJobRepository extends JpaRepository<ImageJob, UUID> {

    Page<ImageJob> findByBatchId(UUID batchId, Pageable pageable);

    Page<ImageJob> findByBatchIdAndStatus(UUID batchId, JobStatus status, Pageable pageable);

    Page<ImageJob> findByBatchIdAndRiskStatus(UUID batchId, RiskStatus riskStatus, Pageable pageable);

    Page<ImageJob> findByBatchIdAndReviewDecision(UUID batchId, ReviewDecision reviewDecision, Pageable pageable);

    @Query("SELECT j FROM ImageJob j WHERE j.batchId = :batchId " +
           "AND (:status IS NULL OR j.status = :status) " +
           "AND (:riskStatus IS NULL OR j.riskStatus = :riskStatus) " +
           "AND (:reviewDecision IS NULL OR j.reviewDecision = :reviewDecision) " +
           "AND (:search IS NULL OR LOWER(j.originalFilename) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR (j.title IS NOT NULL AND LOWER(j.title) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))))")
    Page<ImageJob> searchJobs(
            @Param("batchId") UUID batchId,
            @Param("status") JobStatus status,
            @Param("riskStatus") RiskStatus riskStatus,
            @Param("reviewDecision") ReviewDecision reviewDecision,
            @Param("search") String search,
            Pageable pageable
    );

    List<ImageJob> findByBatchId(UUID batchId);

    List<ImageJob> findByBatchIdAndStatus(UUID batchId, JobStatus status);

    List<ImageJob> findByStatusIn(List<JobStatus> statuses);

    long countByBatchId(UUID batchId);

    long countByBatchIdAndStatus(UUID batchId, JobStatus status);

    long countByBatchIdAndRiskStatus(UUID batchId, RiskStatus riskStatus);

    @Modifying
    @Query("UPDATE ImageJob j SET j.reviewDecision = :decision WHERE j.batchId = :batchId AND j.riskStatus = :riskStatus")
    int updateReviewDecisionByBatchIdAndRiskStatus(
            @Param("batchId") UUID batchId,
            @Param("riskStatus") RiskStatus riskStatus,
            @Param("decision") ReviewDecision decision
    );

    @Modifying
    @Query("UPDATE ImageJob j SET j.status = :targetStatus, j.retryCount = j.retryCount + 1, j.errorMessage = null WHERE j.batchId = :batchId AND j.status = :currentStatus")
    int retryJobsByBatchId(
            @Param("batchId") UUID batchId,
            @Param("currentStatus") JobStatus currentStatus,
            @Param("targetStatus") JobStatus targetStatus
    );
}
