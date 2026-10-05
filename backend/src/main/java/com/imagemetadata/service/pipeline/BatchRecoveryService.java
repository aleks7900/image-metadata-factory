package com.imagemetadata.service.pipeline;

import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.ImageJob;
import com.imagemetadata.model.JobStatus;
import com.imagemetadata.model.ProcessingBatch;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ProcessingBatchRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
public class BatchRecoveryService {

    private final ProcessingBatchRepository batchRepository;
    private final ImageJobRepository jobRepository;
    private final BatchProcessorService batchProcessorService;

    public BatchRecoveryService(
            ProcessingBatchRepository batchRepository,
            ImageJobRepository jobRepository,
            BatchProcessorService batchProcessorService
    ) {
        this.batchRepository = batchRepository;
        this.jobRepository = jobRepository;
        this.batchProcessorService = batchProcessorService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverInterruptedBatches() {
        log.info("Checking for interrupted jobs and batches from prior application runs...");
        resetInterruptedJobs();
        resumeActiveBatches();
        log.info("Startup batch recovery complete.");
    }

    @Transactional
    public void resetInterruptedJobs() {
        List<JobStatus> inFlightStatuses = List.of(
                JobStatus.VISION_ANALYSIS,
                JobStatus.METADATA_GENERATION,
                JobStatus.SAFETY_VALIDATION,
                JobStatus.QUALITY_VALIDATION
        );

        List<ImageJob> interruptedJobs = jobRepository.findByStatusIn(inFlightStatuses);
        if (!interruptedJobs.isEmpty()) {
            log.warn("Found {} in-flight jobs interrupted during shutdown. Resetting to UPLOADED for safe resume.", interruptedJobs.size());
            for (ImageJob job : interruptedJobs) {
                job.setStatus(JobStatus.UPLOADED);
                job.setUpdatedAt(Instant.now());
            }
            jobRepository.saveAllAndFlush(interruptedJobs);
        }
    }

    public void resumeActiveBatches() {
        List<ProcessingBatch> activeBatches = batchRepository.findByStatusIn(List.of(BatchStatus.PROCESSING));
        for (ProcessingBatch batch : activeBatches) {
            log.info("Resuming interrupted batch: {} ({})", batch.getName(), batch.getId());
            batchProcessorService.startBatch(batch.getId());
        }
    }
}
