import rawJobs from '../data/jobs.json';
import { normalizeJobs } from './jobs.js';

const fallbackJobs = normalizeJobs(rawJobs);

function env(name) {
  return String(import.meta.env?.[name] || '').trim();
}

export function hasSupabaseConfig() {
  return Boolean(env('VITE_SUPABASE_URL') && env('VITE_SUPABASE_ANON_KEY'));
}

function fromDb(row) {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyCode: row.company_code || row.company,
    companyColor: row.company_color || '#334155',
    location: row.location || '',
    state: row.state || null,
    remote: Boolean(row.remote),
    payLow: row.pay_low == null ? null : Number(row.pay_low),
    payHigh: row.pay_high == null ? null : Number(row.pay_high),
    payType: row.pay_type || 'salary',
    type: row.employment_type || 'Full-time',
    jobTypes: Array.isArray(row.job_types) ? row.job_types : [],
    easyApply: Boolean(row.easy_apply),
    postedAt: row.posted_at,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    verifiedAt: row.verified_at,
    active: row.active !== false,
    officialUrl: row.official_url || null,
    directUrl: row.source_url || row.official_url || null,
    indeedUrl: row.indeed_url || null,
    linkedinUrl: row.linkedin_url || null,
    sourceName: row.source_name || null,
    description: row.description || '',
  };
}

export async function loadJobs() {
  if (!hasSupabaseConfig()) {
    return { jobs: fallbackJobs, mode: 'snapshot', error: null };
  }

  const base = env('VITE_SUPABASE_URL').replace(/\/$/, '');
  const key = env('VITE_SUPABASE_ANON_KEY');
  const params = new URLSearchParams({
    select: '*',
    active: 'eq.true',
    order: 'posted_at.desc.nullslast',
  });

  try {
    const response = await fetch(`${base}/rest/v1/jobs?${params.toString()}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Database request failed (${response.status})`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Unexpected database response');

    return { jobs: rows.map(fromDb), mode: 'database', error: null };
  } catch (error) {
    console.error('Ag Jobs Pro database load failed; using snapshot fallback.', error);
    return { jobs: fallbackJobs, mode: 'fallback', error: error?.message || 'Database unavailable' };
  }
}
