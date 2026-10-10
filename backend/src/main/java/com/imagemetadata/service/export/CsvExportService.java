package com.imagemetadata.service.export;

import com.imagemetadata.dto.CsvValidationResult;
import com.imagemetadata.model.*;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ImageKeywordRepository;
import com.imagemetadata.repository.SafetyFindingRepository;
import com.imagemetadata.service.storage.ImageStorageService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
public class CsvExportService {

    private final ImageJobRepository jobRepository;
    private final ImageKeywordRepository keywordRepository;
    private final SafetyFindingRepository safetyFindingRepository;
    private final ImageStorageService storageService;

    public CsvExportService(
            ImageJobRepository jobRepository,
            ImageKeywordRepository keywordRepository,
            SafetyFindingRepository safetyFindingRepository,
            @Autowired(required = false) ImageStorageService storageService
    ) {
        this.jobRepository = jobRepository;
        this.keywordRepository = keywordRepository;
        this.safetyFindingRepository = safetyFindingRepository;
        this.storageService = storageService;
    }

    public enum ExportPolicy {
        SAFE_AND_APPROVED,
        SAFE_ONLY,
        ALL
    }

    public enum ExportFormat {
        ADOBE_STOCK,
        STANDARD,
        EXTENDED
    }

    @Transactional(readOnly = true)
    public ByteArrayInputStream exportBatchToCsv(UUID batchId, ExportPolicy policy, ExportFormat format) {
        List<ImageJob> exportableJobs = getExportableJobs(batchId, policy);

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (OutputStreamWriter writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setQuoteMode(org.apache.commons.csv.QuoteMode.MINIMAL).build())) {

            if (format == ExportFormat.ADOBE_STOCK) {
                // Official Adobe Stock Contributor specification: Filename,Title,Keywords,Category,Releases
                csvPrinter.printRecord("Filename", "Title", "Keywords", "Category", "Releases");
            } else if (format == ExportFormat.EXTENDED) {
                csvPrinter.printRecord(
                        "filename", "title", "description", "keywords",
                        "risk_status", "review_decision", "people_detected", "trademark_detected", "ip_detected"
                );
            } else {
                csvPrinter.printRecord("filename", "title", "description", "keywords");
            }

            for (ImageJob job : exportableJobs) {
                List<ImageKeyword> keywords = keywordRepository.findByImageJobIdOrderByPositionAsc(job.getId());
                List<String> keywordStrings = keywords.stream().map(ImageKeyword::getKeyword).toList();
                String keywordsStr = String.join(", ", keywordStrings);

                String filename = sanitizeForCsv(job.getOriginalFilename());
                String title = sanitizeForCsv(job.getTitle() != null ? job.getTitle() : "");
                String description = sanitizeForCsv(job.getDescription() != null ? job.getDescription() : "");
                keywordsStr = sanitizeForCsv(keywordsStr);

                if (format == ExportFormat.ADOBE_STOCK) {
                    int categoryId = resolveCategoryId(job, keywordStrings);
                    String releases = sanitizeForCsv(job.getReleases() != null ? job.getReleases() : "");

                    csvPrinter.printRecord(
                            filename,
                            title,
                            keywordsStr,
                            String.valueOf(categoryId),
                            releases
                    );
                } else if (format == ExportFormat.EXTENDED) {
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
            log.info("Exported batch {} to CSV ({} images exported, policy={}, format={})",
                    batchId, exportableJobs.size(), policy, format);

            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            log.error("Failed to generate CSV for batch {}: {}", batchId, e.getMessage(), e);
            throw new RuntimeException("Error generating CSV export", e);
        }
    }

    @Transactional(readOnly = true)
    public CsvValidationResult validateBatchForAdobeStock(UUID batchId, ExportPolicy policy) {
        List<ImageJob> allJobs = jobRepository.findByBatchId(batchId);
        List<ImageJob> exportableJobs = getExportableJobs(batchId, policy);

        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<Map<String, String>> previewRows = new ArrayList<>();

        if (exportableJobs.isEmpty()) {
            errors.add("No completed images meet the '" + policy.name() + "' export policy criteria.");
        }

        Set<String> seenFilenames = new HashSet<>();

        for (ImageJob job : exportableJobs) {
            String fn = job.getOriginalFilename();
            // Filename check
            if (fn == null || fn.trim().isEmpty()) {
                errors.add("Image Job " + job.getId() + " is missing original filename.");
            } else {
                if (!seenFilenames.add(fn.toLowerCase())) {
                    errors.add("Duplicate filename detected in batch export: '" + fn + "'. Adobe Stock requires unique filenames.");
                }
                if (!fn.matches(".*\\.(jpe?g|png|webp)$")) {
                    warnings.add("File '" + fn + "' does not have a standard image extension (.jpg, .jpeg, .png).");
                }
            }

            // Title check
            String title = job.getTitle();
            if (title == null || title.trim().isEmpty()) {
                errors.add("Image '" + fn + "' has an empty title.");
            } else {
                if (title.length() < 5) {
                    errors.add("Image '" + fn + "' title is too short (" + title.length() + " chars, minimum 5 chars).");
                } else if (title.length() > 200) {
                    errors.add("Image '" + fn + "' title exceeds Adobe Stock maximum of 200 characters.");
                } else if (title.length() > 70) {
                    warnings.add("Image '" + fn + "' title is " + title.length() + " chars (Adobe Stock recommends under 70 characters for higher search conversion).");
                }
            }

            // Keyword check
            List<ImageKeyword> kws = keywordRepository.findByImageJobIdOrderByPositionAsc(job.getId());
            if (kws.size() < 5) {
                errors.add("Image '" + fn + "' has only " + kws.size() + " keywords (Adobe Stock requires at least 5 keywords).");
            } else if (kws.size() < 30) {
                warnings.add("Image '" + fn + "' has " + kws.size() + " keywords (30-45 keywords recommended for stock discoverability).");
            } else if (kws.size() > 50) {
                errors.add("Image '" + fn + "' has " + kws.size() + " keywords (Adobe Stock maximum is 50 keywords).");
            }

            // Category check
            int catId = resolveCategoryId(job, kws.stream().map(ImageKeyword::getKeyword).toList());
            if (catId < 1 || catId > 21) {
                errors.add("Image '" + fn + "' has invalid Adobe Stock category ID: " + catId);
            }

            // Build preview row (first 5)
            if (previewRows.size() < 5) {
                String kwString = kws.stream().map(ImageKeyword::getKeyword).collect(Collectors.joining(", "));
                previewRows.add(Map.of(
                        "Filename", fn != null ? fn : "",
                        "Title", title != null ? title : "",
                        "Keywords", kwString.length() > 60 ? kwString.substring(0, 57) + "..." : kwString,
                        "Category", String.valueOf(catId) + " (" + getCategoryName(catId) + ")",
                        "Releases", job.getReleases() != null ? job.getReleases() : ""
                ));
            }
        }

        boolean isValid = errors.isEmpty();

        return CsvValidationResult.builder()
                .valid(isValid)
                .exportableImagesCount(exportableJobs.size())
                .totalImagesCount(allJobs.size())
                .policy(policy.name())
                .format(ExportFormat.ADOBE_STOCK.name())
                .errors(errors)
                .warnings(warnings)
                .previewRows(previewRows)
                .build();
    }

    @Transactional(readOnly = true)
    public ByteArrayInputStream exportBatchToZipBundle(UUID batchId, ExportPolicy policy, ExportFormat format) {
        if (storageService == null) {
            throw new IllegalStateException("Storage service not available for bundling");
        }

        List<ImageJob> exportableJobs = getExportableJobs(batchId, policy);

        ByteArrayOutputStream zipBaos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(zipBaos)) {
            // 1. Add CSV file
            byte[] csvBytes = exportBatchToCsv(batchId, policy, format).readAllBytes();
            ZipEntry csvEntry = new ZipEntry("adobe_stock_metadata.csv");
            zos.putNextEntry(csvEntry);
            zos.write(csvBytes);
            zos.closeEntry();

            // 2. Add original image files
            for (ImageJob job : exportableJobs) {
                try {
                    byte[] imgBytes = storageService.loadBytes(job.getStoragePath());
                    if (imgBytes != null && imgBytes.length > 0) {
                        ZipEntry imgEntry = new ZipEntry("images/" + job.getOriginalFilename());
                        zos.putNextEntry(imgEntry);
                        zos.write(imgBytes);
                        zos.closeEntry();
                    }
                } catch (Exception e) {
                    log.warn("Could not include image {} in zip bundle: {}", job.getOriginalFilename(), e.getMessage());
                }
            }

            zos.finish();
            log.info("Packaged batch {} into ZIP bundle with {} images and CSV metadata", batchId, exportableJobs.size());
            return new ByteArrayInputStream(zipBaos.toByteArray());
        } catch (Exception e) {
            log.error("Failed to generate zip bundle for batch {}: {}", batchId, e.getMessage(), e);
            throw new RuntimeException("Error generating ZIP export bundle", e);
        }
    }

    private List<ImageJob> getExportableJobs(UUID batchId, ExportPolicy policy) {
        List<ImageJob> allJobs = jobRepository.findByBatchId(batchId);
        return allJobs.stream()
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
    }

    private int resolveCategoryId(ImageJob job, List<String> keywords) {
        if (job.getCategory() != null && job.getCategory() >= 1 && job.getCategory() <= 21) {
            return job.getCategory();
        }
        AdobeStockCategory inferred = AdobeStockCategory.inferCategory(
                job.getTitle(),
                job.getDescription(),
                Collections.emptyList(),
                keywords
        );
        return inferred.getId();
    }

    private String getCategoryName(int id) {
        AdobeStockCategory cat = AdobeStockCategory.fromId(id);
        return cat != null ? cat.getName() : "Unknown";
    }

    /**
     * Sanitizes values against CSV/Spreadsheet formula injection (CWE-1236).
     * Prepend single quote if value begins with dangerous characters: =, +, -, @, tab, newline.
     */
    public String sanitizeForCsv(String value) {
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
