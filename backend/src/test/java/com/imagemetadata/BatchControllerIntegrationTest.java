package com.imagemetadata;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagemetadata.dto.CreateBatchRequest;
import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.ProcessingBatch;
import com.imagemetadata.repository.ProcessingBatchRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BatchControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProcessingBatchRepository batchRepository;

    @Test
    @DisplayName("POST /api/v1/batches should create batch successfully")
    void testCreateBatch() throws Exception {
        CreateBatchRequest request = new CreateBatchRequest("Stock Photos Autumn 2026");

        mockMvc.perform(post("/api/v1/batches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Stock Photos Autumn 2026")))
                .andExpect(jsonPath("$.status", is("QUEUED")));
    }

    @Test
    @DisplayName("GET /api/v1/batches should return paginated batches")
    void testListBatches() throws Exception {
        mockMvc.perform(get("/api/v1/batches")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/v1/batches/{id}/images should accept multipart file upload")
    void testUploadImages() throws Exception {
        ProcessingBatch batch = batchRepository.save(ProcessingBatch.builder()
                .name("Upload Test Batch")
                .status(BatchStatus.QUEUED)
                .build());

        MockMultipartFile file1 = new MockMultipartFile(
                "files",
                "landscape.jpg",
                "image/jpeg",
                new byte[]{ (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x01 }
        );

        mockMvc.perform(multipart("/api/v1/batches/" + batch.getId() + "/images")
                        .file(file1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalImages", is(1)));
    }
}
