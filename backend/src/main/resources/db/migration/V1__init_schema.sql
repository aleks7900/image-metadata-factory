-- V1__init_schema.sql
-- Initial database schema for image metadata batch processor

CREATE TABLE processing_batches (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_images INT NOT NULL DEFAULT 0,
    processed_images INT NOT NULL DEFAULT 0,
    failed_images INT NOT NULL DEFAULT 0,
    safe_images INT NOT NULL DEFAULT 0,
    review_required_images INT NOT NULL DEFAULT 0,
    rejected_images INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE image_jobs (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES processing_batches(id) ON DELETE CASCADE,
    original_filename VARCHAR(500) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    description TEXT,
    risk_status VARCHAR(50) NOT NULL DEFAULT 'SAFE',
    review_decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    processing_duration_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE image_keywords (
    id BIGSERIAL PRIMARY KEY,
    image_job_id UUID NOT NULL REFERENCES image_jobs(id) ON DELETE CASCADE,
    keyword VARCHAR(150) NOT NULL,
    position INT NOT NULL,
    CONSTRAINT uk_job_keyword_position UNIQUE (image_job_id, position)
);

CREATE TABLE safety_findings (
    id BIGSERIAL PRIMARY KEY,
    image_job_id UUID NOT NULL REFERENCES image_jobs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    value VARCHAR(255) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    reason TEXT
);

CREATE TABLE vision_analyses (
    id BIGSERIAL PRIMARY KEY,
    image_job_id UUID NOT NULL UNIQUE REFERENCES image_jobs(id) ON DELETE CASCADE,
    analysis_json TEXT NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE llm_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES processing_batches(id) ON DELETE CASCADE,
    image_job_id UUID REFERENCES image_jobs(id) ON DELETE SET NULL,
    stage VARCHAR(50) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for high-throughput batch operations
CREATE INDEX idx_image_jobs_batch_id ON image_jobs(batch_id);
CREATE INDEX idx_image_jobs_status ON image_jobs(status);
CREATE INDEX idx_image_jobs_risk_status ON image_jobs(risk_status);
CREATE INDEX idx_image_jobs_review_decision ON image_jobs(review_decision);
CREATE INDEX idx_image_keywords_job ON image_keywords(image_job_id);
CREATE INDEX idx_safety_findings_job ON safety_findings(image_job_id);
CREATE INDEX idx_llm_usage_batch ON llm_usage_logs(batch_id);
CREATE INDEX idx_processing_batches_status ON processing_batches(status);
CREATE INDEX idx_processing_batches_created ON processing_batches(created_at DESC);
