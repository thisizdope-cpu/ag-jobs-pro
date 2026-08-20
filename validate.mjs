import fs from 'node:fs';

const jobs = JSON.parse(fs.readFileSync(new URL('../src/data/jobs.json', import.meta.url), 'utf8'));
const required = ['id', 'title', 'company', 'location', 'description'];
const ids = new Set();
let errors = 0;

for (const [index, job] of jobs.entries()) {
  for (const key of required) {
    if (!job[key]) {
      console.error(`Job ${index + 1} missing ${key}`);
      errors += 1;
    }
  }
  if (ids.has(job.id)) {
    console.error(`Duplicate job id: ${job.id}`);
    errors += 1;
  }
  ids.add(job.id);
  if (job.payLow != null && job.payHigh != null && Number(job.payLow) > Number(job.payHigh)) {
    console.error(`Invalid pay range: ${job.id}`);
    errors += 1;
  }
}

if (errors) process.exit(1);
console.log(`Validated ${jobs.length} snapshot jobs.`);
