import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, MapPin, BriefcaseBusiness, Heart, Moon, Sun, Share2,
  Download, ExternalLink, SlidersHorizontal, X, BadgeCheck
} from 'lucide-react';
import { annualize, payLabel, relativeDate } from './lib/jobs.js';
import { loadJobs } from './lib/api.js';

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [dataMode, setDataMode] = useState('loading');
  const [dataError, setDataError] = useState(null);
  const [query, setQuery] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [easyOnly, setEasyOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState(new Set());
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [sort, setSort] = useState('high');
  const [minSalary, setMinSalary] = useState(20000);
  const [favorites, setFavorites] = useState(() => loadSet('agpro_favs_v5'));
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('agpro_dark_v5') === 'true'; }
    catch { return false; }
  });
  const [filtersOpen, setFiltersOpen] = useState(false);


  useEffect(() => {
    let alive = true;
    loadJobs().then(({ jobs: loaded, mode, error }) => {
      if (!alive) return;
      setJobs(loaded);
      setDataMode(mode);
      setDataError(error);
    });
    return () => { alive = false; };
  }, []);

  const companies = useMemo(() => [...new Set(jobs.map(j => j.companyCode).filter(Boolean))].sort(), [jobs]);
  const roles = useMemo(() => [...new Set(jobs.flatMap(j => j.jobTypes || []))].sort(), [jobs]);

  useEffect(() => {
    try { localStorage.setItem('agpro_favs_v5', JSON.stringify([...favorites])); } catch {}
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem('agpro_dark_v5', String(dark)); } catch {}
  }, [dark]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = jobs.filter(job => {
      if (q && !`${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase().includes(q)) return false;
      if (remoteOnly && !job.remote) return false;
      if (easyOnly && !job.easyApply) return false;
      if (favoritesOnly && !favorites.has(job.id)) return false;
      if (selectedCompanies.size && !selectedCompanies.has(job.companyCode)) return false;
      if (selectedRoles.size && !job.jobTypes.some(r => selectedRoles.has(r))) return false;
      const [, high] = annualize(job);
      if (high != null && high < minSalary) return false;
      return true;
    });
    result.sort((a,b) => {
      const [al, ah] = annualize(a), [bl, bh] = annualize(b);
      if (sort === 'low') return (al ?? Infinity) - (bl ?? Infinity);
      if (sort === 'newest') return new Date(b.postedAt) - new Date(a.postedAt);
      return (bh ?? 0) - (ah ?? 0);
    });
    return result;
  }, [query, remoteOnly, easyOnly, favoritesOnly, favorites, selectedCompanies, selectedRoles, sort, minSalary]);

  const stats = useMemo(() => {
    const salaried = jobs.map(annualize).filter(([l,h]) => l && h);
    const avgLow = salaried.length ? salaried.reduce((s,[l]) => s+l,0)/salaried.length : 0;
    const avgHigh = salaried.length ? salaried.reduce((s,[,h]) => s+h,0)/salaried.length : 0;
    return { avgLow, avgHigh };
  }, []);

  function toggleSet(setter, value) {
    setter(prev => { const next = new Set(prev); next.has(value) ? next.delete(value) : next.add(value); return next; });
  }

  function toggleFavorite(id) {
    setFavorites(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function exportCsv() {
    const header = ['Title','Company','Location','Pay Low','Pay High','Type','Official URL','Direct URL','Indeed','LinkedIn'];
    const rows = filtered.map(j => [j.title,j.company,j.location,j.payLow,j.payHigh,j.type,j.officialUrl,j.directUrl,j.indeedUrl,j.linkedinUrl]);
    const csv = [header,...rows].map(row => row.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ag-jobs-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function share() {
    const payload = {title:'Ag Jobs Pro', text:`${filtered.length} professional agriculture jobs`, url:location.href};
    if (navigator.share) {
      await navigator.share(payload).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      window.prompt('Copy this link', window.location.href);
    }
  }

  return <div className={dark ? 'app dark' : 'app'}>
    <header className="hero">
      <div className="heroGlow heroGlowA"/><div className="heroGlow heroGlowB"/>
      <div className="container heroInner">
        <div className="heroTop">
          <div>
            <div className="titleRow"><h1>Ag Jobs Pro</h1><span className="livePill"><i/> {dataMode === 'database' ? `${jobs.length} database jobs` : dataMode === 'loading' ? 'Loading…' : `${jobs.length} imported`}</span></div>
            <p className="subtitle">Professional Ag Insurance • Agribusiness • Crop Insurance • No Farm Labor</p>
            <div className="snapshot"><BadgeCheck size={14}/> {dataMode === 'database' ? 'Connected to live database • availability still verified per listing' : 'Imported snapshot: Aug 4, 2026 — verify availability before applying'}</div>
            {dataMode === 'fallback' && <div className="dataWarning">Database unavailable; showing the built-in snapshot. {dataError}</div>}
          </div>
          <button className="iconBtn glass" onClick={()=>setDark(v=>!v)} aria-label="Toggle appearance">{dark?<Sun/>:<Moon/>}</button>
        </div>
        <div className="notice">Professional roles only — underwriting, adjusting, actuarial, economics, agribusiness and related careers.</div>
        <div className="stats">
          <Stat label="Avg Low" value={`$${Math.round(stats.avgLow/1000)}k`} />
          <Stat label="Avg High" value={`$${Math.round(stats.avgHigh/1000)}k`} />
          <Stat label="Saved" value={favorites.size} />
        </div>
      </div>
    </header>

    <main className="container main">
      <section className="toolbar card">
        <div className="searchBox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, company, location…"/></div>
        <div className="toolbarActions">
          <button className="btn" onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal size={16}/> Filters</button>
          <button className={`btn ${favoritesOnly?'active':''}`} onClick={()=>setFavoritesOnly(v=>!v)}><Heart size={16}/> Saved</button>
          <button className="iconBtn" onClick={share} aria-label="Share"><Share2/></button>
          <button className="iconBtn" onClick={exportCsv} aria-label="Export CSV"><Download/></button>
        </div>
      </section>

      {filtersOpen && <section className="filters card">
        <div className="filterHeader"><strong>Filters</strong><button className="iconBtn" onClick={()=>setFiltersOpen(false)}><X/></button></div>
        <div className="quickToggles">
          <label><input type="checkbox" checked={remoteOnly} onChange={e=>setRemoteOnly(e.target.checked)}/> Remote only</label>
          <label><input type="checkbox" checked={easyOnly} onChange={e=>setEasyOnly(e.target.checked)}/> Easy Apply</label>
        </div>
        <div className="filterGrid">
          <div><h3>Minimum annual pay</h3><input className="range" type="range" min="20000" max="180000" step="10000" value={minSalary} onChange={e=>setMinSalary(Number(e.target.value))}/><small>${Math.round(minSalary/1000)}k+</small></div>
          <div><h3>Companies</h3><div className="chips">{companies.map(c=><button key={c} className={selectedCompanies.has(c)?'chip selected':'chip'} onClick={()=>toggleSet(setSelectedCompanies,c)}>{c}</button>)}</div></div>
          <div><h3>Roles</h3><div className="chips">{roles.map(r=><button key={r} className={selectedRoles.has(r)?'chip selected':'chip'} onClick={()=>toggleSet(setSelectedRoles,r)}>{r}</button>)}</div></div>
        </div>
      </section>}

      <div className="resultsHead">
        <div><strong>{filtered.length}</strong> roles found</div>
        <select value={sort} onChange={e=>setSort(e.target.value)}><option value="high">Highest salary</option><option value="low">Lowest salary</option><option value="newest">Newest</option></select>
      </div>

      {dataMode === 'loading' && <div className="empty card">Loading jobs…</div>}
      <section className="jobsGrid">
        {filtered.map(job => <JobCard key={job.id} job={job} favorite={favorites.has(job.id)} toggleFavorite={toggleFavorite}/>) }
      </section>
      {dataMode !== 'loading' && !filtered.length && <div className="empty card">No jobs match those filters.</div>}
    </main>
  </div>
}

function Stat({label,value}) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }

function JobCard({job,favorite,toggleFavorite}) {
  return <article className="jobCard card">
    <div className="jobTop">
      <div className="companyMark" style={{background:job.companyColor}}>{String(job.companyCode || job.company || 'AG').slice(0,2).toUpperCase()}</div>
      <button className={favorite?'heart active':'heart'} onClick={()=>toggleFavorite(job.id)} aria-label="Save job"><Heart size={19} fill={favorite?'currentColor':'none'}/></button>
    </div>
    <h2>{job.title}</h2>
    <div className="company">{job.company}</div>
    <div className="meta"><span><MapPin size={14}/>{job.location}</span><span><BriefcaseBusiness size={14}/>{job.type}</span></div>
    <div className="badges"><span className="pay">{payLabel(job)}</span>{job.remote&&<span>Remote</span>}{job.easyApply&&<span>Easy Apply</span>}</div>
    <p className="description">{job.description}</p>
    <div className="roleTags">{job.jobTypes.map(t=><span key={t}>{t}</span>)}</div>
    <div className="jobFooter">
      <small>Posted {relativeDate(job.postedAt)}</small>
      <div className="links">
        {job.officialUrl && <a href={job.officialUrl} target="_blank" rel="noreferrer">Official <ExternalLink size={13}/></a>}
        {job.indeedUrl && <a href={job.indeedUrl} target="_blank" rel="noreferrer">Indeed</a>}
        {job.linkedinUrl && <a href={job.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>}
        {!job.officialUrl && job.directUrl && <a href={job.directUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={13}/></a>}
      </div>
    </div>
  </article>
}
