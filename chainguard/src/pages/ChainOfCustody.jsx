import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiHash, FiLink, FiChevronLeft, FiLoader, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { listCases } from '../services/api';
import { custodyTimelines } from '../data/dummyData';

export default function ChainOfCustody() {
  const { token, logout } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

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
        <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Select a case to view its immutable audit trail.</p>
        
        {cases.length === 0 ? (
          <p className="mt-8 text-frost/40 light:text-navy/40">No cases allotted to your account.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <div
                key={c._id}
                onClick={() => setSelectedCase(c)}
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
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const timeline = custodyTimelines[selectedCase.caseId] || custodyTimelines['EVD-10231'];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
      <button 
        onClick={() => setSelectedCase(null)}
        className="mb-6 flex items-center gap-2 text-sm text-frost/60 light:text-navy/60 hover:text-cyan transition-colors"
      >
        <FiChevronLeft /> Back to Cases
      </button>

      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">{selectedCase.caseId}</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{selectedCase.name}</h1>
      <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Every handoff is timestamped, signed, and anchored to the blockchain.</p>

      <div className="relative mt-10">
        <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-blue via-cyan to-green" />
        <div className="flex flex-col gap-6">
          {timeline.map((event, i) => (
            <motion.div
              key={`${event.role}-${i}`}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.06 }}
              className="relative flex gap-5"
            >
              <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy text-cyan glow-border">
                <FiUser />
              </div>
              <div className="glass flex-1 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold">{event.role}</h4>
                  <span className="text-xs text-frost/40 light:text-navy/40">{event.time}</span>
                </div>
                <p className="mt-1 text-sm text-frost/60 light:text-navy/60">{event.person}</p>
                <div className="mt-3 grid gap-2 text-xs text-frost/50 light:text-navy/50 sm:grid-cols-2">
                  <span className="flex items-center gap-1.5"><FiLink className="text-cyan" /> Tx: <span className="font-mono text-cyan/80">{event.tx}</span></span>
                  <span className="flex items-center gap-1.5"><FiHash className="text-cyan" /> Sig: <span className="font-mono text-cyan/80">{event.signature}</span></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
