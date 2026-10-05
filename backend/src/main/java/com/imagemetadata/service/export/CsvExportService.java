package com.imagemetadata.service.export;

import com.imagemetadata.model.*;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ImageKeywordRepository;
import com.imagemetadata.repository.SafetyFindingRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class CsvExportService {

    private final ImageJobRepository jobRepository;
    private final ImageKeywordRepository keywordRepository;
    private final SafetyFindingRepository safetyFindingRepository;

    public CsvExportService(
            ImageJobRepository jobRepository,
            ImageKeywordRepository keywordRepository,
            SafetyFindingRepository safetyFindingRepository
    ) {
        this.jobRepository = jobRepository;
        this.keywordRepository = keywordRepository;
        this.safetyFindingRepository = safetyFindingRepository;
    }

    public enum ExportPolicy {
        SAFE_AND_APPROVED,
        SAFE_ONLY,
        ALL
    }

    public enum ExportFormat {
        STANDARD,
        EXTENDED
    }

    @Transactional(readOnly = true)
    public ByteArrayInputStream exportBatchToCsv(UUID batchId, ExportPolicy policy, ExportFormat format) {
        List<ImageJob> allJobs = jobRepository.findByBatchId(batchId);

        // Filter based on configured commercial export policy
        List<ImageJob> exportableJobs = allJobs.stream()
                .filter(job -> job.getStatus() == JobStatus.READY)
                .filter(job -> {
                    switch (policy) {
                        case SAFE_ONLY:
                            return job.getRiskStatus() == RiskStatus.SAFE;
                        case SAFE_AND_APPROVED:
                            return job.getRiskStatus() == RiskStatus.SAFE || job.getReviewDecision() == ReviewDecision.APPROVED;
                        case ALL:
                        default:
                            return true;
                    }
                })
                .sorted(Comparator.comparing(ImageJob::getOriginalFilename))
                .toList();

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        // Write UTF-8 BOM so spreadsheet apps (like Excel) automatically open in UTF-8
        try {
            out.write(0xEF);
            out.write(0xBB);
            out.write(0xBF);
        } catch (Exception ignored) {}

        try (OutputStreamWriter writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setQuoteMode(org.apache.commons.csv.QuoteMode.MINIMAL).build())) {

            if (format == ExportFormat.EXTENDED) {
                csvPrinter.printRecord(
                        "filename", "title", "description", "keywords",
                        "risk_status", "review_decision", "people_detected", "trademark_detected", "ip_detected"
                );
            } else {
                csvPrinter.printRecord("filename", "title", "description", "keywords");
            }

            for (ImageJob job : exportableJobs) {
                List<ImageKeyword> keywords = keywordRepository.findByImageJobIdOrderByPositionAsc(job.getId());
                String keywordsStr = keywords.stream()
                        .map(ImageKeyword::getKeyword)
                        .collect(Collectors.joining(", "));

                String filename = sanitizeForCsv(job.getOriginalFilename());
                String title = sanitizeForCsv(job.getTitle() != null ? job.getTitle() : "");
                String description = sanitizeForCsv(job.getDescription() != null ? job.getDescription() : "");
                keywordsStr = sanitizeForCsv(keywordsStr);

                if (format == ExportFormat.EXTENDED) {
                    List<SafetyFinding> findings = safetyFindingRepository.findByImageJobId(job.getId());
                    boolean people = findings.stream().anyMatch(f -> f.getType() == SafetyFindingType.PERSON);
                    boolean trademark = findings.stream().anyMatch(f -> f.getType() == SafetyFindingType.TRADEMARK);
                    boolean ip = findings.stream().anyMatch(f -> f.getType() == SafetyFindingType.COPYRIGHT);

                    csvPrinter.printRecord(
                            filename,
                            title,
                            description,
                            keywordsStr,
                            job.getRiskStatus().name(),
                            job.getReviewDecision().name(),
                            people ? "YES" : "NO",
                            trademark ? "YES" : "NO",
                            ip ? "YES" : "NO"
                    );
                } else {
                    csvPrinter.printRecord(filename, title, description, keywordsStr);
                }
            }

            csvPrinter.flush();
            log.info("Exported batch {} to CSV ({} images exported out of {}, policy={}, format={})",
                    batchId, exportableJobs.size(), allJobs.size(), policy, format);

            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            log.error("Failed to generate CSV for batch {}: {}", batchId, e.getMessage(), e);
            throw new RuntimeException("Error generating CSV export", e);
        }
    }

    /**
     * Sanitizes values against CSV/Spreadsheet formula injection (CWE-1236).
     * Prepend single quote if value begins with dangerous characters: =, +, -, @, tab, newline.
     */
    private String sanitizeForCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.startsWith("=") || value.startsWith("+") || value.startsWith("-") ||
            value.startsWith("@") || value.startsWith("\t") || value.startsWith("\r")) {
            return "'" + value;
        }
        return value;
    }
}
