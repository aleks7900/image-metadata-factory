import fs from 'node:fs';
import path from 'node:path';

const API_BASE = 'http://localhost:8080/api/v1';
const DATASET_DIR = path.resolve('test-dataset');

async function run() {
  console.log('=== Step 1: Create 50-Image Recovery Batch ===');
  const createRes = await fetch(`${API_BASE}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Restart Recovery Verification Batch (50 images)',
      description: 'Verifying resume and idempotency after backend termination'
    })
  });

  const batch = await createRes.json();
  const batchId = batch.id;
  console.log(`Created batch ID: ${batchId}`);

  console.log('=== Step 2: Upload 50 Images (10 test images x 5 copies) ===');
  const baseFiles = fs.readdirSync(DATASET_DIR).filter(f => f.endsWith('.jpg')).sort();
  const formData = new FormData();
  
  for (let copy = 1; copy <= 5; copy++) {
    for (const filename of baseFiles) {
      const uniqueName = `copy${copy}-${filename}`;
      const filePath = path.join(DATASET_DIR, filename);
      const buffer = fs.readFileSync(filePath);
      formData.append('files', new Blob([buffer], { type: 'image/jpeg' }), uniqueName);
    }
  }

  const uploadRes = await fetch(`${API_BASE}/batches/${batchId}/images`, {
    method: 'POST',
    body: formData
  });
  const uploadedBatch = await uploadRes.json();
  console.log(`Uploaded ${uploadedBatch.totalImages} images into batch.`);

  console.log('=== Step 3: Start Batch Processing ===');
  await fetch(`${API_BASE}/batches/${batchId}/start`, { method: 'POST' });
  console.log('Batch processing started.');
  fs.writeFileSync('active_recovery_batch.txt', batchId);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
