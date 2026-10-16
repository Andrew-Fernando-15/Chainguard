import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiCopy, FiClock, FiActivity, FiLoader, FiFilter, FiRefreshCw, FiShield, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getAnomalies } from '../services/api';

// Map triggered rule text to icons
function ruleIcon(ruleText) {
  if (!ruleText) return <FiAlertTriangle />;
  const lower = ruleText.toLowerCase();
  if (lower.includes('duplicate') || lower.includes('rule 11')) return <FiCopy />;
  if (lower.includes('time') || lower.includes('rule 6')) return <FiClock />;
  if (lower.includes('hash') || lower.includes('rule 1') || lower.includes('tamper')) return <FiActivity />;
  return <FiAlertTriangle />;
}


export default function AIDetection() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isOversightRole = user?.position === 'Judge' || user?.position === 'CBI' || user?.role === 'Judge' || user?.role === 'CBI';

  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ date: '', role: '', rule: '' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchAnomalies = async (f = filters, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError('');
      let data = await getAnomalies(token, f);
      
      // Frontend safety net: deduplicate repeated anomalies
      if (data && data.length > 0) {
        const seen = new Set();
        data = data.filter((log) => {
          const userId = log.userId?._id || log.userId || log.userName || '';
          const action = log.action || '';
          const caseId = log.caseId || '';
          const details = log.details || '';
          const rules = (log.triggeredRules || []).join(',');
          const timeBucket = Math.floor(new Date(log.createdAt).getTime() / (5 * 60 * 1000));
          const key = `${userId}-${action}-${caseId}-${details}-${rules}-${timeBucket}`;
          
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      
      setAnomalies(data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch anomalies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch and auto-refresh every 8 seconds (Judge & CBI only)
  useEffect(() => {
    if (!token || !isOversightRole) return;
    fetchAnomalies();

    const interval = setInterval(() => {
      fetchAnomalies(filters, true);
    }, 8000);

    return () => clearInterval(interval);
  }, [token, isOversightRole]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAnomalies(filters);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAnomalies(filters);
  };

  const clearFilters = () => {
    const empty = { date: '', role: '', rule: '' };
    setFilters(empty);
    fetchAnomalies(empty);
  };

  // Role Clearance Guard: Only Judge & CBI can view the AI anomaly detection engine
  if (!isOversightRole) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24">
        <div className="glass rounded-3xl border border-rose-500/30 bg-rose-500/5 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner">
            <FiLock size={30} />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
            Access Restricted • Oversight Clearance Required
          </span>
          <h2 className="mt-4 text-2xl font-bold text-frost light:text-navy">
            Judicial & CBI Clearance Required
          </h2>
          <p className="mt-3 text-sm text-frost/70 light:text-navy/70 leading-relaxed">
            The AI Anomaly Detection & Surveillance Audit engine is restricted exclusively to the 
            <strong className="text-frost light:text-navy"> Judiciary (Judge)</strong> and 
            <strong className="text-frost light:text-navy"> Central Bureau of Investigation (CBI)</strong>. 
            Operational investigating officers are restricted from viewing audit telemetry to maintain chain-of-custody evidentiary integrity.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-xl bg-cyan px-6 py-2.5 text-sm font-semibold text-navy hover:bg-cyan/80 transition-colors shadow-lg shadow-cyan/20"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Machine Learning</p>
            <span className="flex items-center gap-1 rounded-full bg-cyan/10 border border-cyan/20 px-2 py-0.5 text-[10px] text-cyan font-mono">
              <FiShield className="text-[11px]" /> Immutable Audit Trail
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">AI Anomaly Detection</h1>
          <p className="mt-1 text-sm text-frost/50 light:text-navy/50">
            Real-time rule engine & heuristic audit log monitor. Anomalies are permanently recorded and cannot be altered or cancelled.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3.5 py-2 text-xs font-medium text-frost/80 light:text-navy/80 hover:bg-white/10 transition-colors"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin text-cyan' : ''} />
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-lg bg-white/10 light:bg-navy/10 px-4 py-2 text-sm text-frost/70 light:text-navy/70 hover:bg-white/20 transition-colors"
        >
          <FiFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        <span className="text-sm text-frost/40 light:text-navy/40">
          {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} found
        </span>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleFilterSubmit}
          className="mt-4 glass rounded-xl p-4 grid gap-4 sm:grid-cols-4"
        >
          <div>
            <label className="block text-xs text-frost/40 light:text-navy/40 mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm text-frost light:text-navy outline-none focus:ring-1 focus:ring-cyan/50"
            />
          </div>
          <div>
            <label className="block text-xs text-frost/40 light:text-navy/40 mb-1">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm text-frost light:text-navy outline-none focus:ring-1 focus:ring-cyan/50 cursor-pointer"
            >
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="">All Roles</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Police">Police</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Forensic">Forensic</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Investigator">Investigator</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Judge">Judge</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="CBI">CBI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-frost/40 light:text-navy/40 mb-1">Rule</label>
            <input
              type="text"
              placeholder="e.g. Rule 6"
              value={filters.rule}
              onChange={(e) => setFilters({ ...filters, rule: e.target.value })}
              className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm text-frost light:text-navy outline-none focus:ring-1 focus:ring-cyan/50"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-cyan/20 px-4 py-2 text-sm text-cyan hover:bg-cyan/30 transition-colors">
              Apply
            </button>
            <button type="button" onClick={clearFilters} className="rounded-lg bg-white/5 light:bg-navy/5 px-4 py-2 text-sm text-frost/50 light:text-navy/50 hover:bg-white/10 transition-colors">
              Clear
            </button>
          </div>
        </motion.form>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-frost/50 light:text-navy/50">
          <FiLoader className="animate-spin" /> Loading anomalies...
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-orange-400/30 bg-orange-400/10 p-4 text-orange-300">
          {error}
        </div>
      )}

      {/* No Results */}
      {!loading && !error && anomalies.length === 0 && (
        <div className="mt-10 text-center text-frost/40 light:text-navy/40">
          <FiAlertTriangle className="inline text-3xl mb-2" />
          <p>No suspicious activities detected. The system is clean.</p>
        </div>
      )}

      {/* Anomaly Cards */}
      {!loading && anomalies.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {anomalies.map((log, i) => (
              <motion.div
                key={log._id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-xl p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hover:bg-white/5 light:hover:bg-navy/5 transition-colors"
              >
                {/* Left: Icon, Action, User */}
                <div className="flex items-start sm:items-center gap-4 sm:w-1/4">
                  <div className="mt-1 sm:mt-0 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 light:bg-navy/5 text-xl text-cyan">
                    {ruleIcon(log.triggeredRules?.[0])}
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-cyan/70 block mb-1">
                      {log.action}
                    </span>
                    <p className="text-sm text-frost/90 light:text-navy/90 font-medium truncate">
                      {log.userName || log.userId?.name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-frost/40 light:text-navy/40 truncate">
                      {log.role || log.userId?.position || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Middle: Case, Rules, Details */}
                <div className="flex-1 min-w-0 sm:px-5 border-y sm:border-y-0 sm:border-x border-white/10 light:border-navy/10 py-3 sm:py-0">
                  {log.caseId && (
                    <p className="text-xs text-frost/50 light:text-navy/50 truncate mb-2">
                      Case: <span className="font-mono text-cyan/60">{log.caseId}</span>
                      {(log.fileName || log.evidenceId?.fileName) && (
                        <> <span className="mx-1.5 opacity-30">•</span> File: <span className="text-frost/70 light:text-navy/70">{log.fileName || log.evidenceId?.fileName}</span></>
                      )}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {log.triggeredRules?.map((rule, idx) => (
                      <span key={idx} className="rounded-md bg-red-400/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                        {rule}
                      </span>
                    ))}
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-frost/40 light:text-navy/40 italic truncate">{log.details}</p>
                  )}
                </div>

                {/* Right: Timestamp */}
                <div className="flex items-center justify-end sm:w-36 sm:text-right flex-shrink-0">
                  <span className="text-xs text-frost/40 light:text-navy/40 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
}
