package com.imagemetadata.repository;

import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.ProcessingBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProcessingBatchRepository extends JpaRepository<ProcessingBatch, UUID> {

    Page<ProcessingBatch> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<ProcessingBatch> findByStatusIn(List<BatchStatus> statuses);
}
