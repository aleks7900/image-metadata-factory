package com.imagemetadata;

import com.imagemetadata.dto.CreateBatchRequest;
import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.JobStatus;
import com.imagemetadata.model.ProcessingBatch;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ProcessingBatchRepository;
import com.imagemetadata.service.BatchManagementService;
import com.imagemetadata.service.ImageJobManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegressionBugFixesIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProcessingBatchRepository batchRepository;

    @Autowired
    private ImageJobRepository jobRepository;

    @Autowired
    private ImageJobManagementService jobService;

    @Autowired
    private BatchManagementService batchService;

    @Test
    @DisplayName("Regression: Searching jobs with null parameters does not cause type casting errors")
    void testSearchJobsWithNullParameters() {
        ProcessingBatch batch = batchRepository.save(ProcessingBatch.builder()
                .name("Search Regression Batch")
                .status(BatchStatus.QUEUED)
                .createdAt(Instant.now())
                .build());

        assertDoesNotThrow(() -> {
            var result = jobService.searchJobs(batch.getId(), null, null, null, null, PageRequest.of(0, 10));
            assertThat(result).isNotNull();
            assertThat(result.getContent()).isEmpty();
        });
    }

    @Test
    @DisplayName("Regression: Unsupported file extension is rejected with HTTP 400 Bad Request")
    void testUnsupportedFileExtensionRejected() throws Exception {
        var batchResponse = batchService.createBatch(new CreateBatchRequest("Upload Test Batch"));
        UUID batchId = batchResponse.getId();

        MockMultipartFile textFile = new MockMultipartFile(
                "files",
                "malicious.txt",
                "text/plain",
                "Not an image file content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/batches/" + batchId + "/images")
                        .file(textFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Unsupported file extension")));
    }

    @Test
    @DisplayName("Regression: Malformed JSON request body returns HTTP 400 instead of HTTP 500")
    void testMalformedJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/batches/concurrency")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{malformed_json_not_quoted: true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Malformed JSON")));
    }

    @Test
    @DisplayName("Regression: Dynamic concurrency adjustment via API is functional")
    void testConcurrencyAdjustmentApi() throws Exception {
        mockMvc.perform(get("/api/v1/batches/concurrency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concurrency").isNumber());

        mockMvc.perform(post("/api/v1/batches/concurrency")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"concurrency\": 8}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concurrency").value(8));

        assertThat(batchService.getConcurrency()).isEqualTo(8);
    }
}
