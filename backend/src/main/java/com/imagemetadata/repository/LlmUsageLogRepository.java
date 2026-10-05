package com.imagemetadata.repository;

import com.imagemetadata.model.LlmUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface LlmUsageLogRepository extends JpaRepository<LlmUsageLog, Long> {

    List<LlmUsageLog> findByBatchId(UUID batchId);

    List<LlmUsageLog> findByImageJobId(UUID imageJobId);

    @Query("SELECT COUNT(u) FROM LlmUsageLog u WHERE u.batchId = :batchId")
    long countByBatchId(@Param("batchId") UUID batchId);

    @Query("SELECT COALESCE(SUM(u.inputTokens), 0) FROM LlmUsageLog u WHERE u.batchId = :batchId")
    long sumInputTokensByBatchId(@Param("batchId") UUID batchId);

    @Query("SELECT COALESCE(SUM(u.outputTokens), 0) FROM LlmUsageLog u WHERE u.batchId = :batchId")
    long sumOutputTokensByBatchId(@Param("batchId") UUID batchId);

    @Query("SELECT COALESCE(SUM(u.estimatedCostUsd), 0.0) FROM LlmUsageLog u WHERE u.batchId = :batchId")
    BigDecimal sumEstimatedCostByBatchId(@Param("batchId") UUID batchId);

    @Query("SELECT COALESCE(AVG(u.durationMs), 0.0) FROM LlmUsageLog u WHERE u.batchId = :batchId")
    double avgDurationMsByBatchId(@Param("batchId") UUID batchId);
}
