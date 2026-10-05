import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8080/api/v1';
const TEST_DIR = path.resolve('test-dataset');

const testImages = [
    '01-safe-landscape.jpg',
    '02-safe-food.jpg',
    '03-person.jpg',
    '04-visible-brand-logo.jpg',
    '05-visible-text.jpg',
    '06-ip-character.jpg',
    '07-architecture.jpg',
    '08-wildlife.jpg',
    '09-blurred-abstract.jpg',
    '10-multi-brand-store.jpg'
];

async function setConcurrency(concurrency) {
    const res = await fetch(`${BASE_URL}/batches/concurrency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurrency })
    });
    return res.json();
}

async function createBatch(name) {
    const res = await fetch(`${BASE_URL}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`Create batch failed: ${res.statusText}`);
    return res.json();
}

async function uploadImages(batchId, count = 50) {
    const formData = new FormData();
    for (let i = 0; i < count; i++) {
        const templateImg = testImages[i % testImages.length];
        const filePath = path.join(TEST_DIR, templateImg);
        const fileBytes = fs.readFileSync(filePath);
        const blob = new Blob([fileBytes], { type: 'image/jpeg' });
        formData.append('files', blob, `c-img-${String(i + 1).padStart(3, '0')}-${templateImg}`);
    }

    const res = await fetch(`${BASE_URL}/batches/${batchId}/images`, {
        method: 'POST',
        body: formData
    });
    if (!res.ok) throw new Error(`Upload images failed: ${res.statusText}`);
    return res.json();
}

async function startBatch(batchId) {
    const res = await fetch(`${BASE_URL}/batches/${batchId}/start`, { method: 'POST' });
    if (!res.ok) throw new Error(`Start batch failed: ${res.statusText}`);
    return res.json();
}

async function getBatch(batchId) {
    const res = await fetch(`${BASE_URL}/batches/${batchId}`);
    return res.json();
}

async function getJobs(batchId) {
    const res = await fetch(`${BASE_URL}/batches/${batchId}/images?size=100`);
    return res.json();
}

async function runBenchmarkForConcurrency(concurrencyLevel, imageCount = 50) {
    console.log(`\n==================================================`);
    console.log(` Starting Benchmark: Concurrency = ${concurrencyLevel}, Images = ${imageCount}`);
    console.log(`==================================================`);

    await setConcurrency(concurrencyLevel);

    const batchName = `Benchmark-Conc-${concurrencyLevel}-${Date.now()}`;
    const batch = await createBatch(batchName);
    console.log(`Created batch ${batch.id} (${batchName})`);

    console.log(`Uploading ${imageCount} images...`);
    const uploadRes = await uploadImages(batch.id, imageCount);
    console.log(`Uploaded ${uploadRes.totalImages} images`);

    console.log(`Starting batch processing...`);
    const startTime = Date.now();
    await startBatch(batch.id);

    let finalBatch;
    while (true) {
        await new Promise(r => setTimeout(r, 400));
        finalBatch = await getBatch(batch.id);
        process.stdout.write(`\rProgress: ${finalBatch.processedImages + finalBatch.failedImages}/${finalBatch.totalImages} (${finalBatch.progressPercentage}%)`);
        if (finalBatch.status === 'COMPLETED' || finalBatch.status === 'FAILED') {
            break;
        }
    }
    const endTime = Date.now();
    const totalDurationSec = (endTime - startTime) / 1000;
    console.log(`\nBatch finished in ${totalDurationSec.toFixed(2)}s with status ${finalBatch.status}`);

    const jobsPage = await getJobs(batch.id);
    const jobs = jobsPage.content || [];

    let totalJobDuration = 0;
    let totalRetries = 0;
    let failedCount = 0;
    let readyCount = 0;

    for (const job of jobs) {
        if (job.status === 'READY') readyCount++;
        else failedCount++;
        totalJobDuration += (job.processingDurationMs || 0);
        totalRetries += (job.retryCount || 0);
    }

    const avgJobDurationMs = jobs.length > 0 ? (totalJobDuration / jobs.length) : 0;
    const imagesPerSec = totalDurationSec > 0 ? (imageCount / totalDurationSec) : 0;

    const result = {
        concurrency: concurrencyLevel,
        totalImages: imageCount,
        readyJobs: readyCount,
        failedJobs: failedCount,
        retryCount: totalRetries,
        totalDurationSec: parseFloat(totalDurationSec.toFixed(2)),
        imagesPerSecond: parseFloat(imagesPerSec.toFixed(2)),
        avgJobDurationMs: parseFloat(avgJobDurationMs.toFixed(1)),
        batchCounters: {
            total: finalBatch.totalImages,
            processed: finalBatch.processedImages,
            failed: finalBatch.failedImages,
            safe: finalBatch.safeImages,
            reviewRequired: finalBatch.reviewRequiredImages,
            rejected: finalBatch.rejectedImages
        }
    };

    console.log(`Results for Concurrency ${concurrencyLevel}:`);
    console.log(`- Total Duration: ${result.totalDurationSec}s`);
    console.log(`- Throughput: ${result.imagesPerSecond} images/sec`);
    console.log(`- Avg Job Duration: ${result.avgJobDurationMs}ms`);
    console.log(`- Ready: ${readyCount}, Failed: ${failedCount}, Retries: ${totalRetries}`);
    console.log(`- Counters match total: ${finalBatch.processedImages + finalBatch.failedImages === imageCount}`);

    return result;
}

async function main() {
    const results = [];
    for (const c of [1, 5, 10]) {
        const r = await runBenchmarkForConcurrency(c, 50);
        results.push(r);
    }

    fs.writeFileSync('concurrency_benchmark_results.json', JSON.stringify(results, null, 2));
    console.log('\n==================================================');
    console.log(' ALL BENCHMARKS COMPLETED');
    console.log('==================================================');
    console.table(results);
}

main().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});
