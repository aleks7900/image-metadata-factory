import fs from 'node:fs';
import path from 'node:path';

const API_BASE = 'http://localhost:8080/api/v1';
const DATASET_DIR = path.resolve('test-dataset');

async function run() {
  console.log('=== Step 1: Create Batch ===');
  const createRes = await fetch(`${API_BASE}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Real Vision Verification Batch',
      description: 'End-to-End Multimodal Verification with OpenAI Vision'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create batch: ${createRes.status} ${errText}`);
  }

  const batch = await createRes.json();
  const batchId = batch.id;
  console.log(`Created batch: ${batch.name} (ID: ${batchId})`);

  console.log('\n=== Step 2: Upload 10 Test Images ===');
  const imageFiles = fs.readdirSync(DATASET_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg')).sort();
  console.log(`Found ${imageFiles.length} images to upload:`, imageFiles);

  const formData = new FormData();
  for (const filename of imageFiles) {
    const filePath = path.join(DATASET_DIR, filename);
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('files', blob, filename);
  }

  const uploadRes = await fetch(`${API_BASE}/batches/${batchId}/images`, {
    method: 'POST',
    body: formData
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload images: ${uploadRes.status} ${errText}`);
  }

  const uploadedBatch = await uploadRes.json();
  console.log(`Successfully uploaded ${uploadedBatch.totalImages} image jobs into batch.`);

  console.log('\n=== Step 3: Trigger Batch Processing with Real Multimodal LLM ===');
  const startRes = await fetch(`${API_BASE}/batches/${batchId}/start`, {
    method: 'POST'
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Failed to start batch: ${startRes.status} ${errText}`);
  }
  console.log('Batch processing started asynchronously. Monitoring progress...');

  // Step 4: Monitor progress
  const startTime = Date.now();
  let completed = false;
  let batchStatus = null;

  while (!completed) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`${API_BASE}/batches/${batchId}`);
    if (!statusRes.ok) continue;
    batchStatus = await statusRes.json();
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`[${elapsedSec}s] Status: ${batchStatus.status} | Processed: ${batchStatus.processedImages}/${batchStatus.totalImages} | Failed: ${batchStatus.failedImages} | Safe: ${batchStatus.safeImages} | Review: ${batchStatus.reviewRequiredImages} | Reject: ${batchStatus.rejectedImages}`);

    if (batchStatus.status === 'COMPLETED' || batchStatus.status === 'FAILED') {
      completed = true;
    }
  }

  console.log('\n=== Step 5: Detailed Results for All Images ===');
  const jobsRes = await fetch(`${API_BASE}/batches/${batchId}/images?size=50`);
  if (!jobsRes.ok) {
    const errText = await jobsRes.text();
    throw new Error(`Failed to get batch images: ${jobsRes.status} ${errText}`);
  }
  const jobsData = await jobsRes.json();
  const jobs = jobsData.content || [];

  const results = [];
  for (const job of jobs) {
    // Fetch full vision analysis
    let visionAnalysis = null;
    try {
      const vRes = await fetch(`${API_BASE}/images/${job.id}/vision`);
      if (vRes.ok) {
        visionAnalysis = await vRes.json();
      }
    } catch (e) {
      // ignore
    }

    const findingTypes = (job.safetyFindings || []).map(f => `${f.type}: ${f.value} (${(f.confidence * 100).toFixed(0)}%)`);
    const peopleFindings = (job.safetyFindings || []).filter(f => f.type === 'PERSON').map(f => f.value);
    const tmFindings = (job.safetyFindings || []).filter(f => f.type === 'TRADEMARK').map(f => f.value);
    const ipFindings = (job.safetyFindings || []).filter(f => f.type === 'COPYRIGHT').map(f => f.value);

    results.push({
      id: job.id,
      filename: job.originalFilename,
      status: job.status,
      risk: job.riskStatus,
      decision: job.reviewDecision,
      title: job.title || '',
      descLength: (job.description || '').length,
      description: job.description || '',
      keywordCount: (job.keywords || []).length,
      keywords: job.keywords || [],
      peopleDetected: peopleFindings.join('; ') || 'None',
      trademarkFindings: tmFindings.join('; ') || 'None',
      ipFindings: ipFindings.join('; ') || 'None',
      allFindings: findingTypes.join('; ') || 'None',
      durationMs: job.processingDurationMs || 0,
      retryCount: job.retryCount || 0,
      hasVisionAnalysis: !!visionAnalysis
    });
  }

  console.log('\n================================================================================');
  console.log('RESULTS SUMMARY TABLE');
  console.log('================================================================================');
  console.table(results.map(r => ({
    Filename: r.filename,
    Risk: r.risk,
    Status: r.status,
    Title: r.title.substring(0, 35) + '...',
    DescLen: r.descLength,
    Keywords: r.keywordCount,
    People: r.peopleDetected,
    Trademarks: r.trademarkFindings,
    IP: r.ipFindings,
    Duration: `${(r.durationMs / 1000).toFixed(1)}s`
  })));

  // Write detailed report to JSON for inspection
  fs.writeFileSync('batch_verification_results.json', JSON.stringify({
    batchSummary: batchStatus,
    images: results
  }, null, 2));
  console.log('Wrote batch_verification_results.json');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
