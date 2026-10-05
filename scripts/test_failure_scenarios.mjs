import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8080/api/v1';
const TEST_DIR = path.resolve('test-dataset');

async function testUnsupportedMime() {
    console.log('\n--- Test 1: Unsupported MIME / File Extension ---');
    const batchRes = await fetch(`${BASE_URL}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'FailureTest-UnsupportedMime' })
    });
    const batch = await batchRes.json();

    const formData = new FormData();
    const badBlob = new Blob(['Hello world this is a text file'], { type: 'text/plain' });
    formData.append('files', badBlob, 'test-document.txt');

    const res = await fetch(`${BASE_URL}/batches/${batch.id}/images`, {
        method: 'POST',
        body: formData
    });

    const body = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Response Error: ${body.error || body.message}`);
    const passed = res.status === 400 && (body.message?.includes('Unsupported') || body.error?.includes('Bad Request'));
    console.log(`Result: ${passed ? 'PASSED (Rejected appropriately)' : 'FAILED'}`);
    return { test: 'Unsupported MIME', status: res.status, passed, detail: body.message };
}

async function testOversizedFile() {
    console.log('\n--- Test 2: Oversized File (>50MB) ---');
    const batchRes = await fetch(`${BASE_URL}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'FailureTest-Oversized' })
    });
    const batch = await batchRes.json();

    // Create 51MB buffer
    console.log('Allocating 51MB test buffer...');
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024, 0xAA);
    const formData = new FormData();
    const largeBlob = new Blob([largeBuffer], { type: 'image/jpeg' });
    formData.append('files', largeBlob, 'oversized-51mb.jpg');

    const res = await fetch(`${BASE_URL}/batches/${batch.id}/images`, {
        method: 'POST',
        body: formData
    });

    const body = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Response: ${body.message || body.error}`);
    const passed = (res.status === 413 || res.status === 400) && (body.message?.includes('50MB') || body.message?.includes('exceeds') || body.message?.includes('size'));
    console.log(`Result: ${passed ? 'PASSED (Rejected appropriately)' : 'FAILED'}`);
    return { test: 'Oversized File', status: res.status, passed, detail: body.message };
}

async function testMixedBatchWithCorruptImage() {
    console.log('\n--- Test 3: Mixed Batch (Valid Image + Corrupt Image) ---');
    const batchRes = await fetch(`${BASE_URL}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'FailureTest-MixedBatch' })
    });
    const batch = await batchRes.json();

    const formData = new FormData();

    // Valid image
    const validBytes = fs.readFileSync(path.join(TEST_DIR, '01-safe-landscape.jpg'));
    formData.append('files', new Blob([validBytes], { type: 'image/jpeg' }), '01-valid-landscape.jpg');

    // Corrupt image (valid .jpg extension, but 100 bytes of garbage text)
    const corruptBytes = Buffer.from('NOT_A_VALID_JPEG_HEADER_CORRUPTED_STREAM_RANDOM_DATA_XYZ_1234567890');
    formData.append('files', new Blob([corruptBytes], { type: 'image/jpeg' }), 'corrupt-stream.jpg');

    const uploadRes = await fetch(`${BASE_URL}/batches/${batch.id}/images`, {
        method: 'POST',
        body: formData
    });
    const uploadBody = await uploadRes.json();
    console.log(`Uploaded ${uploadBody.totalImages} images (1 valid, 1 corrupt)`);

    // Start batch
    await fetch(`${BASE_URL}/batches/${batch.id}/start`, { method: 'POST' });
    console.log('Started batch processing, polling for completion...');

    let finalBatch;
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 500));
        const r = await fetch(`${BASE_URL}/batches/${batch.id}`);
        finalBatch = await r.json();
        if (finalBatch.status === 'COMPLETED' || finalBatch.status === 'FAILED') {
            break;
        }
    }

    console.log(`Final Batch Status: ${finalBatch.status}`);
    console.log(`Processed: ${finalBatch.processedImages}, Failed: ${finalBatch.failedImages}, Total: ${finalBatch.totalImages}`);

    const imagesRes = await fetch(`${BASE_URL}/batches/${batch.id}/images?size=10`);
    const imagesData = await imagesRes.json();

    const validJob = imagesData.content.find(j => j.originalFilename === '01-valid-landscape.jpg');
    const corruptJob = imagesData.content.find(j => j.originalFilename === 'corrupt-stream.jpg');

    console.log(`Valid Image Job Status: ${validJob?.status}, Title: "${validJob?.title}"`);
    console.log(`Corrupt Image Job Status: ${corruptJob?.status}, Error: "${corruptJob?.errorMessage}"`);

    const passed = finalBatch.status === 'COMPLETED'
        && finalBatch.totalImages === 2
        && (finalBatch.processedImages + finalBatch.failedImages) === 2
        && validJob?.status === 'READY';

    console.log(`Batch Not Stuck: ${passed ? 'PASSED' : 'FAILED'}`);
    return {
        test: 'Mixed Batch With Corrupt Image',
        batchStatus: finalBatch.status,
        validJobStatus: validJob?.status,
        corruptJobStatus: corruptJob?.status,
        passed
    };
}

async function main() {
    const results = [];
    results.push(await testUnsupportedMime());
    results.push(await testOversizedFile());
    results.push(await testMixedBatchWithCorruptImage());

    console.log('\n==================================================');
    console.log(' FAILURE SCENARIO TEST SUMMARY');
    console.log('==================================================');
    console.table(results);

    fs.writeFileSync('failure_test_results.json', JSON.stringify(results, null, 2));
}

main().catch(err => {
    console.error('Failure test script error:', err);
    process.exit(1);
});
