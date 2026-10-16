import { useEffect, useMemo, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiLoader, FiPlus, FiX, FiSearch, FiSliders, FiUsers } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { listEvidence, listCases, getAnomalies, createCase, listUsers, updateCaseLimit } from '../services/api';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const chartTextColor = '#94A3B8';
const gridColor = 'rgba(148,163,184,0.08)';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
    y: { ticks: { color: chartTextColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
  },
};

const STATUS_STYLE = {
  Verified: 'text-green bg-green/10',
  Pending: 'text-cyan bg-cyan/10',
  Flagged: 'text-orange-400 bg-orange-400/10',
};

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState([]);
  const [cases, setCases] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Case Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newCaseName, setNewCaseName] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);

  // Case limit per person (changeable by Judge / CBI; default unlimited if null or 0)
  const isOversightRole = user?.position === 'Judge' || user?.position === 'CBI' || user?.role === 'Judge' || user?.role === 'CBI';
  const isExemptFromLimit = isOversightRole;
  const canViewRecentActivity = isOversightRole;
  const effectiveCaseLimit = user?.caseLimit && user.caseLimit > 0 ? user.caseLimit : null;
  const hasReachedCaseLimit = !isExemptFromLimit && effectiveCaseLimit !== null && cases.length >= effectiveCaseLimit;

  // View toggle for Suspicious Activity ('threats' | 'timeline')
  const [susView, setSusView] = useState('threats');

  // Personnel Limits Modal state (for Judge / CBI)
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [personnelList, setPersonnelList] = useState([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [savingLimitUserId, setSavingLimitUserId] = useState(null);
  const [editingLimits, setEditingLimits] = useState({});

  const loadPersonnel = async () => {
    try {
      setLoadingPersonnel(true);
      const data = await listUsers(token);
      setPersonnelList(data || []);
      const initial = {};
      (data || []).forEach((u) => {
        initial[u._id] = u.caseLimit === null || u.caseLimit === undefined ? '' : String(u.caseLimit);
      });
      setEditingLimits(initial);
    } catch (err) {
      console.error('Failed to load personnel:', err);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  const handleSavePersonnelLimit = async (userId) => {
    try {
      setSavingLimitUserId(userId);
      const val = editingLimits[userId];
      const parsed = val === '' || val === null || val === undefined ? null : Number(val);
      const res = await updateCaseLimit(userId, parsed, token);
      
      // Update local personnel list
      setPersonnelList((prev) =>
        prev.map((p) => (p._id === userId ? { ...p, caseLimit: res.user?.caseLimit ?? parsed } : p))
      );
      alert(`Case limit updated for ${res.user?.name || 'personnel'}!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update case limit');
    } finally {
      setSavingLimitUserId(null);
    }
  };

  // Search for Cases (showing all one-by-one without pagination)
  const [caseSearchQuery, setCaseSearchQuery] = useState('');

  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!newCaseId || !newCaseName) return;
    if (hasReachedCaseLimit) {
      alert(`Case limit reached. Your maximum allowed limit is ${effectiveCaseLimit} case(s).`);
      return;
    }
    try {
      setCreatingCase(true);
      const res = await createCase(newCaseId, newCaseName, token);
      setCases([...cases, res.case]);
      setShowCreateModal(false);
      setNewCaseId('');
      setNewCaseName('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create case');
    } finally {
      setCreatingCase(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [items, caseList, anomalyList] = await Promise.all([
          listEvidence(token),
          listCases(token),
          isOversightRole ? getAnomalies(token).catch(() => []) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setEvidence(items || []);
          setCases(caseList || []);
          setAnomalies(anomalyList || []);
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            logout();
          } else {
            setError(err.response?.data?.error || 'Failed to load data from the server.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token, isOversightRole]);

  // ---- Filtering (All cases displayed one-by-one) ----
  const filteredCases = useMemo(() => {
    return cases.filter(c => 
      c.caseId.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(caseSearchQuery.toLowerCase())
    );
  }, [cases, caseSearchQuery]);

  const allottedCaseIds = useMemo(() => new Set(cases.map((c) => c.caseId)), [cases]);

  // Evidence scoped strictly to allotted cases for operational roles; system-wide for Judge/CBI
  const relevantEvidence = useMemo(() => {
    if (isOversightRole) return evidence;
    return evidence.filter((e) => e.caseId && allottedCaseIds.has(e.caseId));
  }, [evidence, allottedCaseIds, isOversightRole]);

  // ---- REAL: derived from live /api/evidence data ----
  const liveStats = useMemo(() => {
    const total = relevantEvidence.length;
    const verified = relevantEvidence.filter((e) => e.status === 'verified').length;
    const pending = relevantEvidence.filter((e) => e.status === 'pending').length;
    const onChain = relevantEvidence.filter((e) => !!e.blockchainTxId).length;
    return [
      { id: 'total', label: isOversightRole ? 'Total Evidence' : 'Allotted Evidence', value: total, accent: 'blue' },
      { id: 'verified', label: 'Verified Files', value: verified, accent: 'green' },
      { id: 'pending', label: 'Pending Reviews', value: pending, accent: 'cyan' },
      { id: 'tx', label: 'Blockchain Transactions', value: onChain, accent: 'blue' },
    ];
  }, [relevantEvidence, isOversightRole]);

  const caseMap = useMemo(() => {
    const map = {};
    cases.forEach((c) => {
      if (c.caseId) map[c.caseId] = c;
    });
    return map;
  }, [cases]);

  const recentActivity = useMemo(() => {
    return [...evidence]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map((e) => {
        const caseDoc = caseMap[e.caseId];
        return {
          id: e._id,
          name: e.fileName,
          caseId: e.caseId,
          caseName: e.caseName || caseDoc?.name || e.caseId || '—',
          caseDbId: caseDoc?._id,
          officer: e.uploadedBy?.name || 'Unknown',
          status: capitalize(e.status),
          time: timeAgo(e.createdAt),
        };
      });
  }, [evidence, caseMap]);

  const uploadTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 });
    }
    relevantEvidence.forEach((e) => {
      const d = new Date(e.createdAt);
      const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
      if (bucket) bucket.count += 1;
    });
    return { labels: months.map((m) => m.label), data: months.map((m) => m.count) };
  }, [relevantEvidence]);

  // ---- REAL: Evidence grouped by forensic category (scoped to allotted cases) ----
  const categoryChartData = useMemo(() => {
    const buckets = {};
    relevantEvidence.forEach((e) => {
      const cat = e.category || 'Miscellaneous';
      buckets[cat] = (buckets[cat] || 0) + 1;
    });

    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    let labels = [];
    let data = [];

    if (sorted.length > 5) {
      const top5 = sorted.slice(0, 5);
      const restCount = sorted.slice(5).reduce((sum, [, c]) => sum + c, 0);
      labels = [...top5.map(([k]) => k), 'Other Categories'];
      data = [...top5.map(([, c]) => c), restCount];
    } else {
      labels = sorted.map(([k]) => k);
      data = sorted.map(([, c]) => c);
    }

    const palette = [
      '#06B6D4', // cyan
      '#3B82F6', // blue
      '#8B5CF6', // purple
      '#F97316', // orange
      '#10B981', // emerald
      '#EC4899', // pink
    ];

    return {
      labels: labels.length > 0 ? labels : ['No Evidence'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: palette.slice(0, Math.max(labels.length, 1)),
        borderWidth: 0,
      }],
    };
  }, [relevantEvidence]);

  // ---- REAL: AI alerts derived from live anomaly data ----
  const alertData = useMemo(() => {
    const buckets = {};
    anomalies.forEach((a) => {
      (a.triggeredRules || []).forEach((rule) => {
        // Extract short rule name like "Rule 6" or "Critical"
        const shortName = rule.match(/^(Rule \d+|Critical)/)?.[0] || rule.slice(0, 20);
        buckets[shortName] = (buckets[shortName] || 0) + 1;
      });
    });
    const labels = Object.keys(buckets).slice(0, 6);
    const data = labels.map((l) => buckets[l]);
    return {
      labels: labels.length > 0 ? labels : ['No anomalies'],
      data: data.length > 0 ? data : [1],
    };
  }, [anomalies]);

  // ---- REAL: Suspicious activity mapped by threat vector ----
  const threatVectorData = useMemo(() => {
    const counts = {
      'Access Denied': 0,
      'Hash Tampering': 0,
      'Delete & Recreate': 0,
      'Duplicate Upload': 0,
      'Off-Hours Access': 0,
    };

    anomalies.forEach((a) => {
      const act = (a.action || '').toUpperCase();
      const rules = (a.triggeredRules || []).join(' ').toLowerCase();
      const details = (a.details || '').toLowerCase();

      let matched = false;
      if (act === 'ACCESS_DENIED' || rules.includes('rule 10') || details.includes('closed')) {
        counts['Access Denied'] = (counts['Access Denied'] || 0) + 1;
        matched = true;
      }
      if (rules.includes('rule 1') || rules.includes('hash mismatch') || details.includes('mismatch')) {
        counts['Hash Tampering'] = (counts['Hash Tampering'] || 0) + 1;
        matched = true;
      }
      if (rules.includes('rule 3') || rules.includes('delete + recreate') || details.includes('delete')) {
        counts['Delete & Recreate'] = (counts['Delete & Recreate'] || 0) + 1;
        matched = true;
      }
      if (rules.includes('rule 11') || rules.includes('duplicate') || details.includes('duplicate')) {
        counts['Duplicate Upload'] = (counts['Duplicate Upload'] || 0) + 1;
        matched = true;
      }
      if (rules.includes('rule 4') || rules.includes('off-hours') || details.includes('off-hours')) {
        counts['Off-Hours Access'] = (counts['Off-Hours Access'] || 0) + 1;
        matched = true;
      }
      if (!matched) {
        const otherName = a.action ? capitalize(a.action.toLowerCase().replace('_', ' ')) : 'Other Alert';
        counts[otherName] = (counts[otherName] || 0) + 1;
      }
    });

    const labels = Object.keys(counts);
    const data = labels.map((k) => counts[k]);

    return {
      labels,
      datasets: [{
        label: 'Security Incidents',
        data,
        backgroundColor: isLight ? '#2563EB' : '#3B82F6',
        borderRadius: 6,
      }],
    };
  }, [anomalies, isLight]);

  // ---- REAL: 14-day rolling timeline with real calendar dates ----
  const timelineData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ key, label, count: 0 });
    }
    anomalies.forEach((a) => {
      const aKey = new Date(a.createdAt).toISOString().slice(0, 10);
      const target = days.find((d) => d.key === aKey);
      if (target) target.count++;
    });
    return {
      labels: days.map((d) => d.label),
      datasets: [{
        label: 'Incidents by Date',
        data: days.map((d) => d.count),
        backgroundColor: isLight ? '#2563EB' : '#06B6D4',
        borderRadius: 6,
      }],
    };
  }, [anomalies, isLight]);

  const lineData = {
    labels: uploadTrend.labels,
    datasets: [{
      label: 'Evidence Uploads',
      data: uploadTrend.data,
      borderColor: isLight ? '#2563EB' : '#06B6D4',
      backgroundColor: isLight ? 'rgba(37,99,235,0.15)' : 'rgba(6,182,212,0.15)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: isLight ? '#2563EB' : '#06B6D4',
    }],
  };

  const alertChartData = {
    labels: alertData.labels,
    datasets: [{
      data: alertData.data,
      backgroundColor: isLight
        ? ['#2563EB', '#3B82F6', '#22C55E', '#F97316', '#EF4444', '#8B5CF6']
        : ['#3B82F6', '#06B6D4', '#22C55E', '#F97316', '#EF4444', '#8B5CF6'],
      borderWidth: 0,
    }],
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Evidence Command Center</h1>
        <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Real-time view across every case, hash, and on-chain transaction.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-orange-400/30 bg-orange-400/10 p-4 text-sm text-orange-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-frost/50 light:text-navy/50">
          <FiLoader className="animate-spin" /> Loading live evidence data...
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {liveStats.map((s) => <StatCard key={s.id} {...s} />)}
          </div>

          <div className="mt-6 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">My Cases</h3>
                <span className="rounded-full bg-cyan/10 px-2.5 py-0.5 text-xs font-mono text-cyan">
                  {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'}
                </span>
                {!isExemptFromLimit && effectiveCaseLimit && (
                  <span className="text-xs text-frost/40 light:text-navy/40">
                    ({cases.length}/{effectiveCaseLimit} limit)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-frost/40" />
                  <input
                    type="text"
                    placeholder="Search Cases..."
                    value={caseSearchQuery}
                    onChange={(e) => setCaseSearchQuery(e.target.value)}
                    className="w-44 sm:w-60 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-4 text-sm outline-none focus:border-cyan/50"
                  />
                </div>

                {/* Judge & CBI button to configure case limits per person */}
                {isExemptFromLimit && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLimitsModal(true);
                      loadPersonnel();
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/20 transition-colors"
                    title="Change case allotment limit for each officer / person"
                  >
                    <FiSliders /> Personnel Case Limits
                  </button>
                )}

                {user?.position === 'Police' && (
                  <button 
                    onClick={() => {
                      if (hasReachedCaseLimit) {
                        alert(`Officer case limit reached. Maximum ${effectiveCaseLimit} cases allowed per officer.`);
                        return;
                      }
                      setShowCreateModal(true);
                    }}
                    disabled={hasReachedCaseLimit}
                    title={hasReachedCaseLimit ? `Case limit reached (max ${effectiveCaseLimit} cases)` : 'Create a new case'}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      hasReachedCaseLimit
                        ? 'bg-white/10 text-frost/40 cursor-not-allowed'
                        : 'bg-cyan text-navy light:text-white hover:bg-cyan/80'
                    }`}
                  >
                    <FiPlus /> Create Case
                  </button>
                )}
              </div>
            </div>
            {cases.length === 0 ? (
              <p className="mt-4 text-sm text-frost/40 light:text-navy/40">You are not allotted to any cases yet.</p>
            ) : filteredCases.length === 0 ? (
              <p className="mt-4 text-sm text-frost/40 light:text-navy/40">No cases found matching your search.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCases.map(c => (
                  <div 
                    key={c._id} 
                    className="rounded-xl border border-white/5 light:border-navy/5 bg-white/5 light:bg-navy/5 p-4 hover:border-cyan/30 cursor-pointer transition-colors" 
                    onClick={() => navigate(`/case/${c._id}`)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-xs text-cyan/70">{c.caseId}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${STATUS_STYLE[c.status] || STATUS_STYLE.Pending}`}>
                        {c.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-frost/90 light:text-navy/90">{c.name}</h4>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <ChartCard 
              title={isOversightRole ? "Evidence Upload Trend" : "Evidence Upload Trend (Allotted Cases)"} 
              className="lg:col-span-2"
            >
              <Line data={lineData} options={baseOptions} />
            </ChartCard>
            <ChartCard 
              title="Evidence by Category"
              headerRight={
                <span className="rounded-full bg-cyan/10 px-2.5 py-0.5 text-[11px] font-mono text-cyan border border-cyan/20">
                  {isOversightRole ? 'System-Wide' : `${cases.length} Allotted Case${cases.length === 1 ? '' : 's'}`}
                </span>
              }
            >
              <Doughnut data={categoryChartData} options={{ ...baseOptions, scales: undefined, plugins: { legend: { position: 'bottom', labels: { color: chartTextColor, boxWidth: 10, font: { size: 10 } } } } }} />
            </ChartCard>
          </div>

          {isOversightRole && (
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <ChartCard 
                title={susView === 'threats' ? 'Suspicious Incidents by Threat Vector' : 'Suspicious Activity Timeline (14 Days)'} 
                className="lg:col-span-2"
                headerRight={
                  <div className="flex items-center gap-1 bg-white/5 light:bg-navy/5 rounded-lg p-0.5 border border-white/10 light:border-navy/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setSusView('threats')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        susView === 'threats'
                          ? 'bg-cyan text-navy light:text-white font-semibold'
                          : 'text-frost/60 light:text-navy/60 hover:text-frost light:hover:text-navy'
                      }`}
                    >
                      Threat Vectors
                    </button>
                    <button
                      type="button"
                      onClick={() => setSusView('timeline')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        susView === 'timeline'
                          ? 'bg-cyan text-navy light:text-white font-semibold'
                          : 'text-frost/60 light:text-navy/60 hover:text-frost light:hover:text-navy'
                      }`}
                    >
                      14-Day Timeline
                    </button>
                  </div>
                }
              >
                <Bar data={susView === 'threats' ? threatVectorData : timelineData} options={baseOptions} />
              </ChartCard>
              <ChartCard title="AI Alerts by Rule">
                <Doughnut data={alertChartData} options={{ ...baseOptions, scales: undefined, plugins: { legend: { position: 'bottom', labels: { color: chartTextColor, boxWidth: 10, font: { size: 10 } } } } }} />
              </ChartCard>
            </div>
          )}

          {canViewRecentActivity && (
            <div className="mt-6 glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-semibold text-lg">Recent Activity</h3>
                <span className="rounded-full bg-cyan/10 px-2.5 py-0.5 text-xs font-mono text-cyan border border-cyan/20">
                  Judge & CBI Audit Trail
                </span>
              </div>
              {recentActivity.length === 0 ? (
                <p className="mt-4 text-sm text-frost/40 light:text-navy/40">No evidence uploaded yet — head to the Upload page to add the first record.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-frost/40 light:text-navy/40">
                        <th className="pb-3">Evidence ID</th>
                        <th className="pb-3">Case Name</th>
                        <th className="pb-3">File</th>
                        <th className="pb-3">Officer</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 light:divide-navy/5">
                      {recentActivity.map((row) => (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-white/5 light:hover:bg-navy/5 transition-colors"
                        >
                          <td className="py-3 font-mono text-xs text-cyan/80">{row.id.slice(-8)}</td>
                          <td className="py-3">
                            {row.caseDbId ? (
                              <button
                                onClick={() => navigate(`/case/${row.caseDbId}`)}
                                className="text-left group cursor-pointer"
                              >
                                <div className="font-medium text-frost/90 light:text-navy/90 group-hover:text-cyan transition-colors">
                                  {row.caseName}
                                </div>
                                {row.caseId && row.caseName !== row.caseId && (
                                  <span className="font-mono text-[11px] text-cyan/70">
                                    {row.caseId}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div>
                                <div className="font-medium text-frost/90 light:text-navy/90">
                                  {row.caseName}
                                </div>
                                {row.caseId && row.caseName !== row.caseId && (
                                  <span className="font-mono text-[11px] text-cyan/70">
                                    {row.caseId}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3">{row.name}</td>
                          <td className="py-3 text-frost/60 light:text-navy/60">{row.officer}</td>
                          <td className="py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS_STYLE[row.status] || STATUS_STYLE.Pending}`}>{row.status}</span>
                          </td>
                          <td className="py-3 text-frost/40 light:text-navy/40">{row.time}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Case Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Create New Case</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-frost/50 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateCase} className="space-y-4">
                <div>
                  <label className="block text-sm text-frost/70 mb-1">Case ID (e.g. CASE-2026-004)</label>
                  <input
                    type="text"
                    required
                    value={newCaseId}
                    onChange={(e) => setNewCaseId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-sm outline-none focus:border-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-frost/70 mb-1">Case Name</label>
                  <input
                    type="text"
                    required
                    value={newCaseName}
                    onChange={(e) => setNewCaseName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-sm outline-none focus:border-cyan/50"
                  />
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={creatingCase}
                    className="flex items-center justify-center gap-2 rounded-lg bg-cyan px-6 py-2 text-sm font-medium text-navy light:text-white transition-opacity disabled:opacity-50"
                  >
                    {creatingCase ? <><FiLoader className="animate-spin" /> Creating...</> : 'Create Case'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Personnel Case Limits Modal (Judge / CBI) */}
      <AnimatePresence>
        {showLimitsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-navy/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                    <FiSliders className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Personnel Case Limits</h3>
                    <p className="text-xs text-frost/50 light:text-navy/50">
                      Configure maximum active case allotments per officer. Leave empty or 0 for unlimited.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLimitsModal(false)} 
                  className="text-frost/50 hover:text-white light:hover:text-navy transition-colors p-1"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="mt-4 overflow-y-auto flex-1 space-y-3 pr-1">
                {loadingPersonnel ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-frost/50">
                    <FiLoader className="animate-spin text-cyan" /> Loading personnel...
                  </div>
                ) : personnelList.length === 0 ? (
                  <p className="py-8 text-center text-sm text-frost/40">No personnel found.</p>
                ) : (
                  personnelList.map((p) => {
                    const isExempt = p.position === 'Judge' || p.position === 'CBI';
                    return (
                      <div 
                        key={p._id}
                        className="rounded-xl border border-white/5 light:border-navy/10 bg-white/[0.03] light:bg-navy/[0.03] p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-frost/90 light:text-navy/90">
                              {p.name}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-cyan font-mono">
                              {p.position}
                            </span>
                            {p.role && p.role !== 'N/A' && (
                              <span className="text-[11px] text-frost/40 light:text-navy/40">
                                • {p.role}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-frost/50 light:text-navy/50 mt-0.5">
                            Active Allotted Cases: <span className="text-cyan font-mono font-medium">{p.activeCasesCount ?? 0}</span>
                            {isExempt && <span className="ml-2 text-[10px] text-frost/30">(Exempt from limits)</span>}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] text-frost/40">Limit:</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Unlimited"
                              value={editingLimits[p._id] ?? ''}
                              onChange={(e) => setEditingLimits({ ...editingLimits, [p._id]: e.target.value })}
                              className="w-24 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-frost light:text-navy outline-none focus:border-cyan/50 text-center"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSavePersonnelLimit(p._id)}
                            disabled={savingLimitUserId === p._id}
                            className="flex items-center gap-1 rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cyan/80 transition-colors disabled:opacity-50"
                          >
                            {savingLimitUserId === p._id ? (
                              <FiLoader className="animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowLimitsModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChartCard({ title, children, className = '', headerRight = null }) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold">{title}</h3>
        {headerRight}
      </div>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}
