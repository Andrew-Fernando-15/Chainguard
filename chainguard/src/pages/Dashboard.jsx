import { useEffect, useMemo, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { motion } from 'framer-motion';
import { FiBell, FiCheckCircle, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { listEvidence, listCases } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  accessRequests, aiAlerts, notifications,
} from '../data/dummyData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const chartTextColor = '#94A3B8';
const gridColor = 'rgba(148,163,184,0.08)';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
    y: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
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
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [items, caseList] = await Promise.all([
          listEvidence(token),
          listCases(token)
        ]);
        if (!cancelled) {
          setEvidence(items || []);
          setCases(caseList || []);
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
  }, [token]);

  // ---- REAL: derived from live /api/evidence data ----
  const liveStats = useMemo(() => {
    const total = evidence.length;
    const verified = evidence.filter((e) => e.status === 'verified').length;
    const pending = evidence.filter((e) => e.status === 'pending').length;
    const onChain = evidence.filter((e) => !!e.blockchainTxId).length;
    return [
      { id: 'total', label: 'Total Evidence', value: total, accent: 'blue' },
      { id: 'verified', label: 'Verified Files', value: verified, accent: 'green' },
      { id: 'pending', label: 'Pending Reviews', value: pending, accent: 'cyan' },
      { id: 'tx', label: 'Blockchain Transactions', value: onChain, accent: 'blue' },
    ];
  }, [evidence]);

  const recentActivity = useMemo(() => {
    return [...evidence]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map((e) => ({
        id: e._id,
        name: e.fileName,
        officer: e.uploadedBy?.name || 'Unknown',
        status: capitalize(e.status),
        time: timeAgo(e.createdAt),
      }));
  }, [evidence]);

  const uploadTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 });
    }
    evidence.forEach((e) => {
      const d = new Date(e.createdAt);
      const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
      if (bucket) bucket.count += 1;
    });
    return { labels: months.map((m) => m.label), data: months.map((m) => m.count) };
  }, [evidence]);

  const verifyData = useMemo(() => {
    const verified = evidence.filter((e) => e.status === 'verified').length;
    const other = evidence.length - verified;
    return { verified, other };
  }, [evidence]);

  const lineData = {
    labels: uploadTrend.labels,
    datasets: [{
      label: 'Evidence Uploads',
      data: uploadTrend.data,
      borderColor: '#06B6D4',
      backgroundColor: 'rgba(6,182,212,0.15)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#06B6D4',
    }],
  };

  // ---- DEMO: access-request logging and AI anomaly detection aren't
  // implemented on the backend yet, so these two charts stay illustrative
  // until those features are built. Everything else on this page is live. ----
  const barData = {
    labels: accessRequests.labels,
    datasets: [{
      label: 'Access Requests',
      data: accessRequests.data,
      backgroundColor: '#3B82F6',
      borderRadius: 6,
    }],
  };

  const alertData = {
    labels: aiAlerts.labels,
    datasets: [{
      data: aiAlerts.data,
      backgroundColor: ['#3B82F6', '#06B6D4', '#22C55E', '#F97316'],
      borderWidth: 0,
    }],
  };

  const verifyChartData = {
    labels: ['Verified', 'Other'],
    datasets: [{
      data: [verifyData.verified, verifyData.other],
      backgroundColor: ['#22C55E', '#3B82F6'],
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
            <h3 className="font-semibold text-lg">My Cases</h3>
            {cases.length === 0 ? (
              <p className="mt-4 text-sm text-frost/40 light:text-navy/40">You are not allotted to any cases yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cases.map(c => (
                  <div key={c._id} className="rounded-xl border border-white/5 light:border-navy/5 bg-white/5 light:bg-navy/5 p-4 hover:border-cyan/30 cursor-pointer transition-colors" onClick={() => navigate(`/case/${c._id}`)}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-xs text-cyan/70">{c.caseId}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${STATUS_STYLE[c.status] || STATUS_STYLE.Pending}`}>{c.status}</span>
                    </div>
                    <h4 className="font-semibold text-frost/90 light:text-navy/90">{c.name}</h4>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <ChartCard title="Evidence Upload Trend" className="lg:col-span-2">
              <Line data={lineData} options={baseOptions} />
            </ChartCard>
            <ChartCard title="AI Alerts" demo>
              <Doughnut data={alertData} options={{ ...baseOptions, scales: undefined, plugins: { legend: { position: 'bottom', labels: { color: chartTextColor, boxWidth: 10, font: { size: 10 } } } } }} />
            </ChartCard>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <ChartCard title="Access Requests" className="lg:col-span-2" demo>
              <Bar data={barData} options={baseOptions} />
            </ChartCard>
            <ChartCard title="Verification Success">
              <Doughnut data={verifyChartData} options={{ ...baseOptions, scales: undefined, plugins: { legend: { position: 'bottom', labels: { color: chartTextColor, boxWidth: 10, font: { size: 10 } } } } }} />
            </ChartCard>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <h3 className="font-semibold">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <p className="mt-4 text-sm text-frost/40 light:text-navy/40">No evidence uploaded yet — head to the Upload page to add the first record.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-frost/40 light:text-navy/40">
                        <th className="pb-3">Evidence ID</th>
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
                          className="hover:bg-white/5 light:bg-navy/5"
                        >
                          <td className="py-3 font-mono text-xs text-cyan/80">{row.id.slice(-8)}</td>
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

            <div className="glass rounded-2xl p-6">
              <h3 className="flex items-center gap-2 font-semibold"><FiBell /> Notifications</h3>
              <p className="mt-1 text-xs text-frost/30 light:text-navy/30">Demo feed — activity alerts aren't wired to the backend yet.</p>
              <div className="mt-4 space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-xl bg-white/5 light:bg-navy/5 p-3 text-sm">
                    {n.type === 'alert' ? <FiAlertTriangle className="mt-0.5 flex-shrink-0 text-orange-400" /> : <FiCheckCircle className="mt-0.5 flex-shrink-0 text-green" />}
                    <div>
                      <p className="text-frost/80 light:text-navy/80">{n.text}</p>
                      <p className="text-xs text-frost/40 light:text-navy/40">{n.time} ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children, className = '', demo = false }) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {demo && <span className="rounded-full bg-white/5 light:bg-navy/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-frost/30 light:text-navy/30">Demo data</span>}
      </div>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}
