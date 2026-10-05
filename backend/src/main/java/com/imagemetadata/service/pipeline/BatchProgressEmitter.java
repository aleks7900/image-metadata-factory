package com.imagemetadata.service.pipeline;

import com.imagemetadata.dto.BatchProgressEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class BatchProgressEmitter {

    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter registerEmitter(UUID batchId) {
        // 30 minute timeout for long-running batches
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);

        emitters.computeIfAbsent(batchId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(batchId, emitter));
        emitter.onTimeout(() -> removeEmitter(batchId, emitter));
        emitter.onError(e -> removeEmitter(batchId, emitter));

        try {
            // Initial heartbeat / connection ack
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("batchId", batchId, "status", "LISTENING")));
        } catch (IOException e) {
            removeEmitter(batchId, emitter);
        }

        return emitter;
    }

    public void emitProgress(BatchProgressEvent event) {
        List<SseEmitter> batchEmitters = emitters.get(event.getBatchId());
        if (batchEmitters == null || batchEmitters.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : batchEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("BATCH_PROGRESS")
                        .data(event));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        batchEmitters.removeAll(deadEmitters);
    }

    private void removeEmitter(UUID batchId, SseEmitter emitter) {
        List<SseEmitter> batchEmitters = emitters.get(batchId);
        if (batchEmitters != null) {
            batchEmitters.remove(emitter);
            if (batchEmitters.isEmpty()) {
                emitters.remove(batchId);
            }
        }
    }
}
