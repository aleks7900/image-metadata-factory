package com.imagemetadata;

import com.imagemetadata.model.*;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ImageKeywordRepository;
import com.imagemetadata.repository.SafetyFindingRepository;
import com.imagemetadata.service.export.CsvExportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CsvExportServiceTest {

    @Mock
    private ImageJobRepository jobRepository;

    @Mock
    private ImageKeywordRepository keywordRepository;

    @Mock
    private SafetyFindingRepository safetyFindingRepository;

    @InjectMocks
    private CsvExportService csvExportService;

    private UUID batchId;
    private ImageJob safeJob;
    private ImageJob reviewJobApproved;
    private ImageJob rejectJob;

    @BeforeEach
    void setUp() {
        batchId = UUID.randomUUID();

        safeJob = ImageJob.builder()
                .id(UUID.randomUUID())
                .batchId(batchId)
                .originalFilename("landscape.jpg")
                .status(JobStatus.READY)
                .title("Majestic Sunrise Peak")
                .description("Scenic morning light on snowy ridge.")
                .riskStatus(RiskStatus.SAFE)
                .reviewDecision(ReviewDecision.APPROVED)
                .build();

        reviewJobApproved = ImageJob.builder()
                .id(UUID.randomUUID())
                .batchId(batchId)
                .originalFilename("person.jpg")
                .status(JobStatus.READY)
                .title("Smiling Executive")
                .description("Portrait with verified release.")
                .riskStatus(RiskStatus.REVIEW_REQUIRED)
                .reviewDecision(ReviewDecision.APPROVED)
                .build();

        rejectJob = ImageJob.builder()
                .id(UUID.randomUUID())
                .batchId(batchId)
                .originalFilename("trademark.jpg")
                .status(JobStatus.READY)
                .title("=DANGEROUS_FORMULA()")
                .description("+PAYLOAD")
                .riskStatus(RiskStatus.REJECT)
                .reviewDecision(ReviewDecision.REJECTED)
                .build();
    }

    @Test
    @DisplayName("SAFE_AND_APPROVED policy exports safe and approved jobs while excluding rejected jobs")
    void testPolicyFiltering() throws Exception {
        when(jobRepository.findByBatchId(batchId)).thenReturn(List.of(safeJob, reviewJobApproved, rejectJob));
        when(keywordRepository.findByImageJobIdOrderByPositionAsc(any())).thenReturn(List.of(
                ImageKeyword.builder().keyword("peak").position(1).build(),
                ImageKeyword.builder().keyword("snow").position(2).build()
        ));

        ByteArrayInputStream stream = csvExportService.exportBatchToCsv(
                batchId,
                CsvExportService.ExportPolicy.SAFE_AND_APPROVED,
                CsvExportService.ExportFormat.STANDARD
        );

        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        List<String> lines = reader.lines().toList();

        // 1 header line + 2 data lines (safeJob and reviewJobApproved)
        assertEquals(3, lines.size());
        assertTrue(lines.get(0).contains("filename,title,description,keywords"));
        assertTrue(lines.stream().anyMatch(l -> l.contains("landscape.jpg")));
        assertTrue(lines.stream().anyMatch(l -> l.contains("person.jpg")));
        assertFalse(lines.stream().anyMatch(l -> l.contains("trademark.jpg")));
    }

    @Test
    @DisplayName("Formula injection strings starting with = or + should be sanitized with leading quote")
    void testFormulaInjectionSanitization() throws Exception {
        when(jobRepository.findByBatchId(batchId)).thenReturn(List.of(rejectJob));
        when(keywordRepository.findByImageJobIdOrderByPositionAsc(any())).thenReturn(List.of());

        ByteArrayInputStream stream = csvExportService.exportBatchToCsv(
                batchId,
                CsvExportService.ExportPolicy.ALL,
                CsvExportService.ExportFormat.STANDARD
        );

        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        List<String> lines = reader.lines().toList();

        String row = lines.get(1);
        // Formula =DANGEROUS_FORMULA() must be sanitized with leading quote '=DANGEROUS_FORMULA()
        assertTrue(row.contains("'=DANGEROUS_FORMULA()"));
        assertTrue(row.contains("'+PAYLOAD"));
    }
}
