import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiCopy, FiClock, FiActivity, FiLoader, FiFilter } from 'react-icons/fi';
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
  const { token } = useAuth();
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ date: '', role: '', rule: '' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchAnomalies = async (f = filters) => {
    try {
      setLoading(true);
      setError('');
      let data = await getAnomalies(token, f);
      
      // Frontend safety net: deduplicate anomalies grouped by minute
      if (data && data.length > 0) {
        const seen = new Set();
        data = data.filter(log => {
          const userId = log.userId?._id || log.userId || '';
          const caseId = log.caseId || '';
          const details = log.details || '';
          const date = new Date(log.createdAt);
          const minTime = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          const key = `${userId}-${caseId}-${details}-${minTime}`;
          
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
    }
  };

  useEffect(() => {
    if (token) fetchAnomalies();
  }, [token]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAnomalies(filters);
  };

  const clearFilters = () => {
    const empty = { date: '', role: '', rule: '' };
    setFilters(empty);
    fetchAnomalies(empty);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Machine Learning</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">AI Anomaly Detection</h1>
      <p className="mt-1 text-sm text-frost/50 light:text-navy/50">
        Rule-based checks scan every action in real time. Showing live suspicious activity from the database.
      </p>

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
                      {log.evidenceId?.fileName && (
                        <> <span className="mx-1.5 opacity-30">•</span> File: <span className="text-frost/70 light:text-navy/70">{log.evidenceId.fileName}</span></>
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
