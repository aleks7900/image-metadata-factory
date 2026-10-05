import fs from 'node:fs';
import path from 'node:path';

const API_BASE = 'http://localhost:8080/api/v1';
const DATASET_DIR = path.resolve('test-dataset');

async function run() {
  console.log('=== Step 1: Create Recovery Test Batch ===');
  const createRes = await fetch(`${API_BASE}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Recovery Test Batch',
      description: 'Testing backend termination and recovery during processing'
    })
  });

  const batch = await createRes.json();
  const batchId = batch.id;
  console.log(`Created recovery batch: ${batchId}`);

  console.log('=== Step 2: Upload 10 Images ===');
  const imageFiles = fs.readdirSync(DATASET_DIR).filter(f => f.endsWith('.jpg')).sort();
  const formData = new FormData();
  for (const filename of imageFiles) {
    const filePath = path.join(DATASET_DIR, filename);
    const buffer = fs.readFileSync(filePath);
    formData.append('files', new Blob([buffer], { type: 'image/jpeg' }), filename);
  }

  const uploadRes = await fetch(`${API_BASE}/batches/${batchId}/images`, {
    method: 'POST',
    body: formData
  });
  console.log('Uploaded images, starting batch...');

  await fetch(`${API_BASE}/batches/${batchId}/start`, { method: 'POST' });
  console.log('Batch started. Batch ID:', batchId);
  fs.writeFileSync('recovery_batch_id.txt', batchId);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
