# Image Metadata Factory
### Production Full-Stack LLM/Vision Image Metadata Batch Processor

A high-throughput, enterprise-grade batch processing platform engineered to analyze images through multimodal Vision models, generate commercially compliant stock metadata, audit trademarks, recognizable persons, and intellectual property, and produce formula-safe CSV exports for premier stock marketplace submissions (Adobe Stock, Getty Images, Shutterstock).

---

## 1. System Architecture & Processing Pipeline

```
  ┌─────────────────┐
  │  Client Upload  │ ── 1 to 1,000 images per batch (JPEG, PNG, WEBP)
  └────────┬────────┘
           │
           ▼
     [ UPLOADED ] ────── Images stored to disk/S3 abstraction; Jobs queued in PostgreSQL
           │
           ▼
  [ VISION_ANALYSIS ] ── Multimodal LLM extracts subjects, objects, lighting, mood, visible text
           │
           ▼
[ METADATA_GENERATION ]─ Generates stock title, 100-250 char description, 30-45 ordered keywords
           │
           ▼
 [ SAFETY_VALIDATION ] ─ Dual deterministic regex & LLM audit for trademarks, persons, and copyright IP
           │
           ▼
[ QUALITY_VALIDATION ] ─ Validates lengths, keyword deduplication; automatic single repair if needed
           │
      ┌────┴────┐
      ▼         ▼
  [ READY ]  [ FAILED ] ── Retries with exponential backoff & full diagnostic tracking
      │
      ▼
 ┌──────────┐
 │CSV Export│ ────────── Sanitized against spreadsheet formula injection (CWE-1236)
 └──────────┘
```

---

## 2. Key Features

- **Multimodal Computer Vision Analysis**: Extracts structured features including subjects, objects, environment, composition, lighting, dominant palette, and visible text.
- **Stock Metadata Generation**:
  - **Title**: Natural, descriptive, searchable stock title without brand stuffing.
  - **Description**: Natural 100–250 character commercial description.
  - **Keywords**: Strictly **30–45 keywords** sorted by commercial relevance, with stem-based deduplication preventing singular/plural redundancies.
- **Trademark, People, and IP Safety Auditing**:
  - **Trademarks**: Detects logos, brand names, and trade dress using both deterministic pattern matching and semantic vision validation.
  - **People & Privacy**: Assesses recognizable faces and flags model release requirements without facial recognition.
  - **Intellectual Property**: Identifies copyrighted characters, movie/game franchises, and proprietary designs.
- **Risk Classification**: Categorizes each asset into `SAFE`, `REVIEW_REQUIRED`, or `REJECT` with auditable reasoning.
- **Automated Metadata Quality Repair**: Detects violations and triggers a targeted repair cycle before finalization.
- **Batch Processing & High Throughput**: Configurable worker pool concurrency (`app.processing.concurrency: 5`), streaming I/O (no full-resolution images held in JVM memory).
- **Restart Recovery & Resumability**: On application boot, in-flight jobs are recovered automatically without duplicate processing.
- **Live Progress Reporting**: Real-time Server-Sent Events (SSE) stream progress and latest completions directly to the browser.
- **Interactive Review UI**: Grid and table views with thumbnail previews, full-resolution zoom, metadata editor, safety finding meters, and bulk approval actions.
- **Marketplace CSV Export**: Customizable policies (`Safe & Approved`, `Strict Safe`, `All Images`) with automatic spreadsheet formula injection protection.
- **Token & Cost Observability**: Tracks input tokens, output tokens, latency, and estimated cost aggregated at batch level.

---

## 3. Technology Stack

### Backend
- **Java 21** (LTS)
- **Spring Boot 3.3.4** (Spring Web, Spring Data JPA, Spring Security, Spring Validation, Actuator)
- **PostgreSQL 16** with **Flyway** database migrations
- **Lombok**
- **Apache Commons CSV** (RFC 4180 compliant)
- **Apache Tika** (MIME type verification)
- **Server-Sent Events (SSE)** for real-time progress streaming
- **JUnit 5**, **Mockito**, **Testcontainers**, **H2** (for unit/integration testing)

### Frontend
- **React 19** + **TypeScript**
- **Vite 8**
- **Tailwind CSS v4** (Modern glassmorphism & dark aesthetic)
- **TanStack React Query v5** (Server state, caching, auto-polling)
- **React Router v7**
- **Lucide Icons**
- **Vitest** + **Testing Library**

---

## 4. Quick Start with Docker Compose

To run the entire system (PostgreSQL + Backend + Frontend) in one command:

```bash
# 1. Clone or navigate to the repository
cd image-metadata-factory

# 2. Copy the environment template
cp .env.example .env

# 3. Start all services
docker compose up -d
```

### Access URLs:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend REST API**: `http://localhost:8080/api/v1/batches`
- **Actuator Health**: `http://localhost:8080/actuator/health`

---

## 5. Local Development Setup

### Prerequisites
- JDK 21+ (`temurin-21` or equivalent)
- Node.js 20+ and npm
- Docker (for PostgreSQL)

### Step 1: Start PostgreSQL
```bash
docker run --name imagemetadata-db \
  -e POSTGRES_DB=imagemetadata \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16-alpine
```

### Step 2: Start Spring Boot Backend
```bash
cd backend

# On Linux/macOS:
./mvnw spring-boot:run

# On Windows:
.\mvnw.cmd spring-boot:run
```
*The backend starts at `http://localhost:8080` with the deterministic `mock` LLM provider enabled by default.*

### Step 3: Start React Frontend
```bash
cd frontend
npm install
npm run dev
```
*The frontend starts at `http://localhost:5173` with auto-proxying to the backend API.*

---

## 6. Configuring LLM Providers

The system isolates LLM providers behind the `ImageMetadataProvider` interface:

```java
public interface ImageMetadataProvider {
    ImageAnalysisResult analyzeVision(ImageAnalysisRequest request);
    ImageAnalysisResult generateMetadata(VisionAnalysisDto vision, ImageAnalysisRequest request);
    ImageAnalysisResult validateSafety(VisionAnalysisDto vision, String title, String description, List<String> keywords, ImageAnalysisRequest request);
    ImageAnalysisResult repairMetadata(VisionAnalysisDto vision, String currentTitle, String currentDescription, List<String> currentKeywords, List<String> violations, ImageAnalysisRequest request);
    String getProviderName();
}
```

### Option A: Mock Provider (Default - Offline & Zero-Cost)
Enabled by default. Simulates realistic latency, generates rich commercial stock metadata, and accurately evaluates trademarks/people for testing without requiring an API key:
```yaml
app:
  llm:
    provider: mock
```

### Option B: OpenAI / Multimodal Vision Compatible API
Supports OpenAI GPT-4o / GPT-4o-mini, OpenRouter, or local vision backends (Ollama, vLLM):
```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o-mini"
# Optional custom base URL:
# export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
```

---

## 7. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/batches` | Create a new batch |
| `GET` | `/api/v1/batches` | List batches with pagination and token metrics |
| `GET` | `/api/v1/batches/{id}` | Get batch details and aggregated statistics |
| `DELETE` | `/api/v1/batches/{id}` | Delete batch and associated images |
| `POST` | `/api/v1/batches/{id}/images` | Multipart file upload of images |
| `GET` | `/api/v1/batches/{id}/images` | Filtered, paginated list of images in batch |
| `POST` | `/api/v1/batches/{id}/start` | Start asynchronous batch processing |
| `POST` | `/api/v1/batches/{id}/pause` | Pause batch processing |
| `POST` | `/api/v1/batches/{id}/resume` | Resume paused batch processing |
| `POST` | `/api/v1/batches/{id}/bulk-retry` | Retry all failed jobs in batch |
| `POST` | `/api/v1/batches/{id}/bulk-review` | Bulk approve/reject flagged images |
| `GET` | `/api/v1/batches/{id}/events` | Server-Sent Events (SSE) live progress stream |
| `GET` | `/api/v1/batches/{id}/export.csv` | Export batch to marketplace-ready CSV |
| `GET` | `/api/v1/images/{id}` | Get full image metadata, safety findings, vision context |
| `GET` | `/api/v1/images/{id}/preview` | Serve binary image for preview |
| `PATCH` | `/api/v1/images/{id}/metadata` | Manually update title, description, and keywords |
| `POST` | `/api/v1/images/{id}/approve` | Mark image review decision as APPROVED |
| `POST` | `/api/v1/images/{id}/reject` | Mark image review decision as REJECTED |
| `POST` | `/api/v1/images/{id}/retry` | Retry failed image job |
| `POST` | `/api/v1/images/{id}/regenerate` | Clear and re-run entire pipeline for image |

---

## 8. Running the Automated Test Suite

The test suite runs completely offline with no paid API keys required:

### Backend Tests
```bash
cd backend
.\mvnw.cmd test
```
*Executes unit tests, repository tests, safety audits, CSV formula sanitization, and Spring MockMvc integration tests.*

### Frontend Tests & Typecheck
```bash
cd frontend
npm run test
npm run build
```
*Executes Vitest component tests, TypeScript type checks, and Vite production bundle compilation.*

---

## 9. Security & Commercial Compliance

- **CSV / Spreadsheet Formula Injection Defense (CWE-1236)**: Fields starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are sanitized with leading single quotes.
- **Path Traversal Protection**: Files are stored under dedicated UUIDs within strictly verified base directories; paths containing `..` are rejected.
- **MIME & File Validation**: Uploads are verified against supported image formats (`image/jpeg`, `image/png`, `image/webp`).
- **Server-Side API Key Storage**: External LLM credentials are kept strictly in backend environment variables and never exposed to the frontend.
