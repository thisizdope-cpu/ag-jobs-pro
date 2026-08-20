const SNAPSHOT_DATE = new Date('2026-08-04T12:00:00Z');

export function normalizeJobs(rawJobs) {
  return rawJobs.map((job) => {
    const postedAt = new Date(SNAPSHOT_DATE);
    postedAt.setUTCDate(postedAt.getUTCDate() - (job.postedDaysAgo ?? 0));
    return {
      ...job,
      postedAt: postedAt.toISOString(),
      active: true,
      firstSeenAt: SNAPSHOT_DATE.toISOString(),
      lastSeenAt: SNAPSHOT_DATE.toISOString(),
      verifiedAt: null,
      officialUrl: isOfficial(job.directUrl) ? job.directUrl : null,
      directUrl: job.directUrl || null,
    };
  });
}

export function isOfficial(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !host.includes('indeed.com') && !host.includes('linkedin.com') && !host.includes('monster.com');
  } catch {
    return false;
  }
}

export function relativeDate(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return 'future date';
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

export function annualize(job) {
  if (job.payLow == null || job.payHigh == null) return [null, null];
  return job.payType === 'hourly'
    ? [job.payLow * 2080, job.payHigh * 2080]
    : [job.payLow, job.payHigh];
}

export function payLabel(job) {
  if (job.payLow == null || job.payHigh == null) return 'Pay undisclosed';
  if (job.payType === 'hourly') return `$${job.payLow}–$${job.payHigh}/hr`;
  return `$${Math.round(job.payLow / 1000)}k–$${Math.round(job.payHigh / 1000)}k`;
}
