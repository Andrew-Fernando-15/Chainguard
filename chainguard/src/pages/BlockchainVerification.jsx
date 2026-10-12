import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiCheckCircle, FiXCircle, FiLoader, FiUser, FiLink } from 'react-icons/fi';
import { verifyEvidence } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BlockchainVerification() {
  const [evidenceDbId, setEvidenceDbId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { token } = useAuth();

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!evidenceDbId) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await verifyEvidence(evidenceDbId, null, token);
      setResult(res);
    } catch (err) {
      alert(err.response?.data?.error || 'Verification failed');
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Verify</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Blockchain Verification</h1>
      <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Confirm a piece of evidence hasn't been altered by comparing the database record against the smart contract on Ganache.</p>

      <form onSubmit={handleVerify} className="mt-8 space-y-6">
        <div className="glass flex gap-3 rounded-2xl p-3">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-frost/40 light:text-navy/40" />
            <input
              required
              value={evidenceDbId}
              onChange={(e) => setEvidenceDbId(e.target.value)}
              placeholder="Enter Database Evidence ID (e.g. 64f1...)"
              className="w-full rounded-xl bg-white/5 light:bg-navy/5 py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-cyan/50"
            />
          </div>
        </div>

        <button disabled={!evidenceDbId || loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue to-cyan px-6 py-3 text-sm font-medium text-navy disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <FiLoader className="animate-spin" /> : 'Fetch Details & Verify'}
        </button>
      </form>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass mt-6 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              {result.match ? (
                <>
                  <FiCheckCircle className="text-2xl text-green" />
                  <div>
                    <p className="font-semibold text-green">Hash Match Confirmed</p>
                    <p className="text-xs text-frost/50 light:text-navy/50">This evidence is intact and unaltered on the blockchain.</p>
                  </div>
                </>
              ) : (
                <>
                  <FiXCircle className="text-2xl text-red-400" />
                  <div>
                    <p className="font-semibold text-red-400">Hash Mismatch Detected</p>
                    <p className="text-xs text-frost/50 light:text-navy/50">This physical file does not match the smart contract record — potential tampering.</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 space-y-3 divide-y divide-white/5 light:divide-navy/5 font-mono text-xs">
              <DetailRow label="Original Hash (Blockchain)" value={result.originalHash} />
              <DetailRow label="Current Hash (Local)" value={result.currentHash} />
              <DetailRow label="Transaction Hash" value={result.txHash} />
              <DetailRow label="Timestamp" value={result.timestamp} />
              <DetailRow label="Smart Contract Address" value={result.contract} />
            </div>

            {/* Custody Log Section */}
            {result.custodyLog && result.custodyLog.length > 0 && (
              <div className="mt-6 border-t border-white/5 light:border-navy/5 pt-4">
                <h3 className="font-semibold text-sm mb-3">On-Chain Custody Log</h3>
                <div className="space-y-2">
                  {result.custodyLog.map((entry, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 rounded-lg bg-white/5 light:bg-navy/5 p-3"
                    >
                      <FiUser className="text-cyan mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-xs">
                        <p className="text-frost/70 light:text-navy/70 font-medium">{entry.action}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-frost/40 light:text-navy/40">
                          <span className="flex items-center gap-1">
                            <FiLink className="text-cyan" /> {entry.actor?.slice(0, 10)}...{entry.actor?.slice(-6)}
                          </span>
                          <span>{new Date(entry.timestamp * 1000).toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 pt-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-sans text-frost/40 light:text-navy/40">{label}</span>
      <span className="break-all text-cyan">{value}</span>
    </div>
  );
}
