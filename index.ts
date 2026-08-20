// Supabase Edge Function: normalized job upsert endpoint.
// Intended for trusted ingestion workers, not browser clients.
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INGEST_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'content-type': 'application/json',
};

function canonicalKey(job: Record<string, unknown>) {
  const company = String(job.company || '').trim().toLowerCase();
  const title = String(job.title || '').trim().toLowerCase();
  const location = String(job.location || '').trim().toLowerCase();
  return `${company}|${title}|${location}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expected = Deno.env.get('INGEST_SECRET');
  const supplied = req.headers.get('x-ingest-secret');
  if (!expected || supplied !== expected) return new Response('Unauthorized', { status: 401 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response('Server is not configured', { status: 500 });

  const body = await req.json().catch(() => null);
  const incoming = Array.isArray(body?.jobs) ? body.jobs : [];
  if (!incoming.length) return Response.json({ inserted: 0, message: 'No jobs supplied' });

  const now = new Date().toISOString();
  const rows = [];
  for (const job of incoming.slice(0, 500)) {
    if (!job?.title || !job?.company) continue;
    const canonical = canonicalKey(job);
    const canonicalHash = (await sha256(canonical)).slice(0, 24);
    const rawHash = await sha256(JSON.stringify(job));
    rows.push({
      id: String(job.id || canonicalHash),
      canonical_key: canonicalHash,
      title: String(job.title),
      company: String(job.company),
      company_code: job.companyCode || job.company_code || job.company,
      company_color: job.companyColor || job.company_color || '#334155',
      location: job.location || '',
      state: job.state || null,
      remote: Boolean(job.remote),
      pay_low: job.payLow ?? job.pay_low ?? null,
      pay_high: job.payHigh ?? job.pay_high ?? null,
      pay_type: job.payType || job.pay_type || 'salary',
      employment_type: job.type || job.employment_type || 'Full-time',
      job_types: job.jobTypes || job.job_types || [],
      easy_apply: Boolean(job.easyApply ?? job.easy_apply),
      description: job.description || '',
      source_name: job.sourceName || job.source_name || null,
      source_url: job.sourceUrl || job.source_url || job.directUrl || null,
      official_url: job.officialUrl || job.official_url || null,
      indeed_url: job.indeedUrl || job.indeed_url || null,
      linkedin_url: job.linkedinUrl || job.linkedin_url || null,
      posted_at: job.postedAt || job.posted_at || null,
      last_seen_at: now,
      verified_at: job.verifiedAt || job.verified_at || null,
      active: true,
      raw_hash: rawHash,
    });
  }

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await client.from('jobs').upsert(rows, { onConflict: 'canonical_key' }).select('id');
  if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  return Response.json({ upserted: data?.length || 0 }, { headers: corsHeaders });
});
