package com.imagemetadata.service.pipeline;

import com.imagemetadata.dto.BatchProgressEvent;
import com.imagemetadata.model.*;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ProcessingBatchRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@Slf4j
@Service
public class BatchProcessorService {

    private final ProcessingBatchRepository batchRepository;
    private final ImageJobRepository jobRepository;
    private final ImagePipelineService pipelineService;
    private final BatchProgressEmitter progressEmitter;

    private volatile int concurrency;
    private ThreadPoolExecutor executor;
    private final Set<UUID> activeBatchIds = ConcurrentHashMap.newKeySet();
    private final Set<UUID> pausedBatchIds = ConcurrentHashMap.newKeySet();

    public BatchProcessorService(
            ProcessingBatchRepository batchRepository,
            ImageJobRepository jobRepository,
            ImagePipelineService pipelineService,
            BatchProgressEmitter progressEmitter,
            @Value("${app.processing.concurrency:5}") int concurrency
    ) {
        this.batchRepository = batchRepository;
        this.jobRepository = jobRepository;
        this.pipelineService = pipelineService;
        this.progressEmitter = progressEmitter;
        this.concurrency = concurrency;
    }

    @PostConstruct
    public void init() {
        this.executor = new ThreadPoolExecutor(
                concurrency,
                concurrency,
                60L,
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(5000),
                new ThreadFactory() {
                    private int count = 1;
                    @Override
                    public Thread newThread(Runnable r) {
                        Thread t = new Thread(r, "batch-worker-" + count++);
                        t.setDaemon(true);
                        return t;
                    }
                },
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
        log.info("Initialized BatchProcessorService with concurrency: {}", concurrency);
    }

    @PreDestroy
    public void shutdown() {
        if (executor != null) {
            executor.shutdown();
            try {
                if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
                    executor.shutdownNow();
                }
            } catch (InterruptedException e) {
                executor.shutdownNow();
            }
        }
    }

    public synchronized void setConcurrency(int newConcurrency) {
        if (newConcurrency > 0 && executor != null) {
            if (newConcurrency > executor.getMaximumPoolSize()) {
                executor.setMaximumPoolSize(newConcurrency);
                executor.setCorePoolSize(newConcurrency);
            } else {
                executor.setCorePoolSize(newConcurrency);
                executor.setMaximumPoolSize(newConcurrency);
            }
            this.concurrency = newConcurrency;
            log.info("BatchProcessorService concurrency dynamically updated to: {}", newConcurrency);
        }
    }

    public int getConcurrency() {
        return concurrency;
    }

    @Transactional
    public void startBatch(UUID batchId) {
        ProcessingBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new IllegalArgumentException("Batch not found: " + batchId));

        if (batch.getStatus() == BatchStatus.PROCESSING && activeBatchIds.contains(batchId)) {
            log.info("Batch {} is already running", batchId);
            return;
        }

        pausedBatchIds.remove(batchId);
        activeBatchIds.add(batchId);

        batch.setStatus(BatchStatus.PROCESSING);
        if (batch.getStartedAt() == null) {
            batch.setStartedAt(Instant.now());
        }
        batchRepository.save(batch);

        triggerBatchProcessing(batchId);
    }

    public void pauseBatch(UUID batchId) {
        pausedBatchIds.add(batchId);
        activeBatchIds.remove(batchId);

        ProcessingBatch batch = batchRepository.findById(batchId).orElse(null);
        if (batch != null && batch.getStatus() == BatchStatus.PROCESSING) {
            batch.setStatus(BatchStatus.PAUSED);
            batchRepository.save(batch);
        }
        log.info("Batch {} has been paused", batchId);
    }

    public void resumeBatch(UUID batchId) {
        startBatch(batchId);
    }

    public void triggerBatchProcessing(UUID batchId) {
        CompletableFuture.runAsync(() -> {
            try {
                List<ImageJob> pendingJobs = jobRepository.findByBatchIdAndStatus(batchId, JobStatus.UPLOADED);
                log.info("Batch {}: Dispatching {} pending jobs to worker pool", batchId, pendingJobs.size());

                List<CompletableFuture<Void>> futures = new ArrayList<>();
                for (ImageJob job : pendingJobs) {
                    if (pausedBatchIds.contains(batchId)) {
                        log.info("Batch {} paused, stopping further dispatch", batchId);
                        break;
                    }

                    CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                        if (pausedBatchIds.contains(batchId)) {
                            return;
                        }
                        try {
                            pipelineService.processJob(job.getId());
                        } catch (Exception e) {
                            log.error("Unhandled error processing job {}: {}", job.getId(), e.getMessage());
                        } finally {
                            updateBatchProgressAndEmit(batchId, job.getId());
                        }
                    }, executor);

                    futures.add(future);
                }

                // Wait for current set of jobs to finish
                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

                // Check final completion
                checkAndFinalizeBatch(batchId);
            } catch (Exception e) {
                log.error("Error during batch {} execution: {}", batchId, e.getMessage(), e);
            }
        });
    }

    @Transactional
    public void retryFailedJobs(UUID batchId) {
        List<ImageJob> failedJobs = jobRepository.findByBatchIdAndStatus(batchId, JobStatus.FAILED);
        log.info("Batch {}: Resetting {} failed jobs for retry", batchId, failedJobs.size());

        for (ImageJob job : failedJobs) {
            job.setStatus(JobStatus.UPLOADED);
            job.setErrorMessage(null);
            job.setRetryCount(job.getRetryCount() + 1);
            job.setUpdatedAt(Instant.now());
        }
        jobRepository.saveAll(failedJobs);

        startBatch(batchId);
    }

    @Transactional
    public synchronized void updateBatchProgressAndEmit(UUID batchId, UUID currentJobId) {
        ProcessingBatch batch = batchRepository.findById(batchId).orElse(null);
        if (batch == null) return;

        List<ImageJob> allJobs = jobRepository.findByBatchId(batchId);
        int total = allJobs.size();
        int processed = 0;
        int failed = 0;
        int safe = 0;
        int reviewRequired = 0;
        int rejected = 0;

        for (ImageJob j : allJobs) {
            if (j.getStatus() == JobStatus.READY) {
                processed++;
                if (j.getRiskStatus() == RiskStatus.SAFE) safe++;
                else if (j.getRiskStatus() == RiskStatus.REVIEW_REQUIRED) reviewRequired++;
                else if (j.getRiskStatus() == RiskStatus.REJECT) rejected++;
            } else if (j.getStatus() == JobStatus.FAILED) {
                failed++;
            }
        }

        batch.setTotalImages(total);
        batch.setProcessedImages(processed);
        batch.setFailedImages(failed);
        batch.setSafeImages(safe);
        batch.setReviewRequiredImages(reviewRequired);
        batch.setRejectedImages(rejected);

        double progressPercent = total > 0 ? ((double) (processed + failed) / total) * 100.0 : 0.0;

        // If all are completed
        if (total > 0 && (processed + failed) >= total) {
            batch.setStatus(failed == total ? BatchStatus.FAILED : BatchStatus.COMPLETED);
            batch.setCompletedAt(Instant.now());
            activeBatchIds.remove(batchId);
        }

        batchRepository.save(batch);

        // Fetch current job details for notification
        ImageJob currentJob = currentJobId != null ? jobRepository.findById(currentJobId).orElse(null) : null;

        BatchProgressEvent event = BatchProgressEvent.builder()
                .batchId(batchId)
                .status(batch.getStatus())
                .totalImages(total)
                .processedImages(processed)
                .failedImages(failed)
                .safeImages(safe)
                .reviewRequiredImages(reviewRequired)
                .rejectedImages(rejected)
                .progressPercentage(Math.round(progressPercent * 10.0) / 10.0)
                .latestJobId(currentJobId)
                .latestFilename(currentJob != null ? currentJob.getOriginalFilename() : "")
                .latestJobStatus(currentJob != null ? currentJob.getStatus() : null)
                .message("Processed " + (processed + failed) + " of " + total + " images")
                .build();

        progressEmitter.emitProgress(event);
    }

    @Transactional
    public void checkAndFinalizeBatch(UUID batchId) {
        ProcessingBatch batch = batchRepository.findById(batchId).orElse(null);
        if (batch == null) return;

        long pendingCount = jobRepository.countByBatchIdAndStatus(batchId, JobStatus.UPLOADED);
        if (pendingCount == 0 && !pausedBatchIds.contains(batchId)) {
            updateBatchProgressAndEmit(batchId, null);
            activeBatchIds.remove(batchId);
            log.info("Batch {} processing complete. Status: {}", batchId, batch.getStatus());
        }
    }
}
