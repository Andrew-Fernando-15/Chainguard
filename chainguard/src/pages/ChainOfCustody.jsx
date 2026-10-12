import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUser, FiHash, FiLink, FiChevronLeft, FiLoader, FiShield, 
  FiAlertCircle, FiDownload, FiUploadCloud, FiEye, FiLock, 
  FiUnlock, FiUsers, FiFolder, FiCheckCircle, FiFileText 
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { listCases, getCustodyTimeline } from '../services/api';

// Map action keywords to human-readable metadata, badges, and icons
function getActionMeta(action) {
  const a = (action || '').toLowerCase();
  if (a.includes('upload')) {
    return {
      label: 'Evidence Uploaded',
      icon: <FiUploadCloud />,
      badge: 'text-green bg-green/10 border-green/20',
      iconBg: 'bg-green/10 text-green border-green/30'
    };
  }
  if (a.includes('download')) {
    return {
      label: 'Evidence Downloaded',
      icon: <FiDownload />,
      badge: 'text-cyan bg-cyan/10 border-cyan/20',
      iconBg: 'bg-cyan/10 text-cyan border-cyan/30'
    };
  }
  if (a.includes('view')) {
    return {
      label: 'Evidence Viewed & Inspected',
      icon: <FiEye />,
      badge: 'text-blue bg-blue/10 border-blue/20',
      iconBg: 'bg-blue/10 text-blue border-blue/30'
    };
  }
  if (a.includes('reopen')) {
    return {
      label: 'Case Reopened by Court/CBI',
      icon: <FiUnlock />,
      badge: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
      iconBg: 'bg-orange-400/10 text-orange-400 border-orange-400/30'
    };
  }
  if (a.includes('close')) {
    return {
      label: 'Case Closed & Sealed',
      icon: <FiLock />,
      badge: 'text-red-400 bg-red-400/10 border-red-400/20',
      iconBg: 'bg-red-400/10 text-red-400 border-red-400/30'
    };
  }
  if (a.includes('reassign') || a.includes('assign')) {
    return {
      label: 'Case Reassigned / Officer Allotted',
      icon: <FiUsers />,
      badge: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      iconBg: 'bg-purple-400/10 text-purple-400 border-purple-400/30'
    };
  }
  if (a.includes('open') || a.includes('create')) {
    return {
      label: 'Case Registered & Opened',
      icon: <FiFolder />,
      badge: 'text-cyan bg-cyan/10 border-cyan/20',
      iconBg: 'bg-cyan/10 text-cyan border-cyan/30'
    };
  }
  if (a.includes('status')) {
    return {
      label: 'Case Status Updated',
      icon: <FiCheckCircle />,
      badge: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
      iconBg: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
    };
  }
  return {
    label: action ? action.charAt(0).toUpperCase() + action.slice(1) : 'Custody Event',
    icon: <FiShield />,
    badge: 'text-cyan bg-cyan/10 border-cyan/20',
    iconBg: 'bg-navy text-cyan border-cyan/30'
  };
}

export default function ChainOfCustody() {
  const { token, logout } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  useEffect(() => {
    async function fetchCases() {
      try {
        setLoading(true);
        const data = await listCases(token);
        setCases(data || []);
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
        } else {
          setError('Failed to load cases. Are you connected to the backend?');
        }
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchCases();
  }, [token]);

  const handleSelectCase = async (c) => {
    setSelectedCase(c);
    setTimelineLoading(true);
    setTimelineError('');
    setTimeline([]);

    try {
      const data = await getCustodyTimeline(c._id, token);
      setTimeline(data.timeline || []);
      if (data.status || data.allottedTo) {
        setSelectedCase(prev => ({
          ...prev,
          status: data.status || prev.status,
          allottedTo: data.allottedTo || prev.allottedTo
        }));
      }
    } catch (err) {
      setTimelineError(err.response?.data?.error || 'Failed to fetch custody timeline from blockchain.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!timeline.length || !selectedCase) return;
    const headers = ['Timestamp', 'Action', 'Actor Name', 'Actor Role', 'Details', 'File Name', 'Verification Source', 'Transaction Hash'];
    const rows = timeline.map(event => {
      const meta = getActionMeta(event.action);
      return [
        `"${new Date(event.timestamp * 1000).toLocaleString()}"`,
        `"${meta.label}"`,
        `"${event.actorName || 'Unknown'}"`,
        `"${event.actorRole || 'Officer'}"`,
        `"${(event.details || '').replace(/"/g, '""')}"`,
        `"${event.evidenceFileName || 'N/A'}"`,
        `"${event.source === 'blockchain' ? 'Blockchain On-Chain' : 'Audit Trail'}"`,
        `"${event.txHash || 'N/A'}"`
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ChainOfCustody_${selectedCase.caseId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-frost/50 light:text-navy/50"><FiLoader className="animate-spin text-2xl" /></div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 p-4 text-orange-300">{error}</div>
      </div>
    );
  }

  if (!selectedCase) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Chain of Custody</h1>
        <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Select a case to view its immutable audit trail recorded on the blockchain.</p>
        
        {cases.length === 0 ? (
          <p className="mt-8 text-frost/40 light:text-navy/40">No cases allotted to your account.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <div
                key={c._id}
                onClick={() => handleSelectCase(c)}
                className="glass cursor-pointer rounded-xl p-5 transition-transform hover:-translate-y-1 hover:glow-border"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 light:bg-navy/5 text-cyan">
                    <FiShield />
                  </span>
                  <div>
                    <h3 className="font-semibold">{c.caseId}</h3>
                    <p className="text-sm text-frost/50 light:text-navy/50">{c.name}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-frost/40 light:text-navy/40">
                  <span className={`rounded-full px-2 py-0.5 ${c.status === 'Active' ? 'text-blue bg-blue/10' : c.status === 'Closed' ? 'text-frost/60 bg-white/10' : 'text-cyan bg-cyan/10'}`}>
                    {c.status}
                  </span>
                  <span className="text-[11px] text-frost/40">View Custody &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      <button 
        onClick={() => setSelectedCase(null)}
        className="mb-6 flex items-center gap-2 text-sm text-frost/60 light:text-navy/60 hover:text-cyan transition-colors"
      >
        <FiChevronLeft /> Back to Cases
      </button>

      {/* Case Header Details Card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan bg-cyan/10 px-2.5 py-1 rounded-md font-semibold">
                {selectedCase.caseId}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                selectedCase.status === 'Active' ? 'text-blue bg-blue/10 border border-blue/20' :
                selectedCase.status === 'Closed' ? 'text-frost/60 bg-white/10 border border-white/20' :
                'text-cyan bg-cyan/10 border border-cyan/20'
              }`}>
                {selectedCase.status}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl text-frost/90 light:text-navy/90">
              {selectedCase.name}
            </h1>
            <p className="mt-1 text-sm text-frost/50 light:text-navy/50">
              Immutable chain-of-custody recorded on Ethereum blockchain & verified audit logs.
            </p>
          </div>
          {!timelineLoading && timeline.length > 0 && (
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-lg bg-cyan px-4 py-2.5 text-sm font-semibold text-navy hover:bg-cyan/80 transition-colors flex-shrink-0 self-start sm:self-center"
            >
              <FiDownload /> Export Audit CSV
            </button>
          )}
        </div>

        {/* Allotted Officers & Stats */}
        <div className="mt-5 pt-4 border-t border-white/10 light:border-navy/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-frost/60 light:text-navy/60">
            <FiUsers className="text-cyan text-sm" />
            <span>Allotted Officers:</span>
            <span className="font-medium text-frost/90 light:text-navy/90">
              {selectedCase.allottedTo && selectedCase.allottedTo.length > 0 ? selectedCase.allottedTo.join(', ') : 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-frost/50 light:text-navy/50 font-mono">
            <span>{timeline.length} Custody Event{timeline.length === 1 ? '' : 's'} Logged</span>
          </div>
        </div>
      </div>

      {timelineLoading && (
        <div className="mt-12 flex items-center justify-center gap-2 text-frost/50 light:text-navy/50">
          <FiLoader className="animate-spin text-xl text-cyan" /> Loading blockchain custody log...
        </div>
      )}

      {timelineError && (
        <div className="mt-6 rounded-xl border border-orange-400/30 bg-orange-400/10 p-4 text-orange-300 flex items-center gap-2">
          <FiAlertCircle /> {timelineError}
        </div>
      )}

      {!timelineLoading && !timelineError && timeline.length === 0 && (
        <div className="mt-12 text-center text-frost/40 light:text-navy/40 glass rounded-2xl p-8">
          <FiShield className="inline text-3xl mb-2 text-cyan" />
          <p>No custody records found yet for this case. Actions and uploads will automatically record here.</p>
        </div>
      )}

      {!timelineLoading && timeline.length > 0 && (
        <div className="relative mt-10">
          <div className="absolute left-5 top-3 bottom-3 w-px bg-gradient-to-b from-blue via-cyan to-green opacity-40" />
          <div className="flex flex-col gap-5">
            {timeline.map((event, i) => {
              const meta = getActionMeta(event.action);
              return (
                <motion.div
                  key={`${event.action}-${event.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex gap-5"
                >
                  {/* Timeline action icon */}
                  <div className={`relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border text-lg ${meta.iconBg}`}>
                    {meta.icon}
                  </div>

                  {/* Card Body */}
                  <div className="glass flex-1 rounded-xl p-5 hover:border-cyan/30 transition-colors">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${meta.badge}`}>
                          {meta.label}
                        </span>
                        {event.source === 'blockchain' ? (
                          <span className="rounded-full bg-green/10 border border-green/20 px-2 py-0.5 text-[10px] font-mono text-green">
                            On-Chain
                          </span>
                        ) : (
                          <span className="rounded-full bg-cyan/10 border border-cyan/20 px-2 py-0.5 text-[10px] font-mono text-cyan">
                            Audit Trail
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-frost/50 light:text-navy/50">
                        {new Date(event.timestamp * 1000).toLocaleString()}
                      </span>
                    </div>

                    {/* Actor information */}
                    <div className="mt-2.5 flex items-center gap-2 text-sm">
                      <FiUser className="text-cyan/70 text-xs" />
                      <span className="font-semibold text-frost/90 light:text-navy/90">
                        {event.actorName}
                      </span>
                      <span className="text-frost/40 light:text-navy/40 text-xs">
                        • {event.actorRole}
                      </span>
                    </div>

                    {/* Event Details */}
                    {event.details && (
                      <p className="mt-2 text-xs text-frost/70 light:text-navy/70 bg-white/5 light:bg-navy/5 p-2.5 rounded-lg border border-white/5 light:border-navy/5">
                        {event.details}
                      </p>
                    )}

                    {/* Metadata Footer */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-frost/50 light:text-navy/50 pt-2 border-t border-white/5 light:border-navy/5">
                      {event.evidenceFileName && (
                        <span className="flex items-center gap-1.5">
                          <FiFileText className="text-cyan/70" /> File: <span className="text-frost/80 font-medium">{event.evidenceFileName}</span>
                        </span>
                      )}
                      {event.txHash && (
                        <span className="flex items-center gap-1.5">
                          <FiLink className="text-cyan/70" /> Tx: <span className="font-mono text-cyan/80">{event.txHash.slice(0, 10)}...{event.txHash.slice(-8)}</span>
                        </span>
                      )}
                      {event.actor && event.actor.startsWith('0x') && (
                        <span className="flex items-center gap-1.5">
                          <FiHash className="text-cyan/70" /> Address: <span className="font-mono text-cyan/80">{event.actor.slice(0, 8)}...{event.actor.slice(-6)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
