import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import { mockVerifyEvidence } from '../services/api';

export default function BlockchainVerification() {
  const [evidenceId, setEvidenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!evidenceId) return;
    setLoading(true);
    setResult(null);
    const res = await mockVerifyEvidence(evidenceId);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Verify</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Blockchain Verification</h1>
      <p className="mt-1 text-sm text-frost/50">Confirm a piece of evidence hasn't been altered since it was recorded on-chain.</p>

      <form onSubmit={handleVerify} className="glass mt-8 flex gap-3 rounded-2xl p-3">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-frost/40" />
          <input
            value={evidenceId}
            onChange={(e) => setEvidenceId(e.target.value)}
            placeholder="Enter Evidence ID, e.g. EVD-10231"
            className="w-full rounded-xl bg-white/5 py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-cyan/50"
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue to-cyan px-6 py-3 text-sm font-medium text-navy">
          {loading ? <FiLoader className="animate-spin" /> : 'Verify'}
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
                    <p className="text-xs text-frost/50">This evidence is intact and unaltered.</p>
                  </div>
                </>
              ) : (
                <>
                  <FiXCircle className="text-2xl text-red-400" />
                  <div>
                    <p className="font-semibold text-red-400">Hash Mismatch Detected</p>
                    <p className="text-xs text-frost/50">This evidence may have been tampered with.</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 space-y-3 divide-y divide-white/5 font-mono text-xs">
              <DetailRow label="Original Hash" value={result.originalHash} />
              <DetailRow label="Current Hash" value={result.currentHash} />
              <DetailRow label="Transaction Hash" value={result.txHash} />
              <DetailRow label="Timestamp" value={result.timestamp} />
              <DetailRow label="Smart Contract Address" value={result.contract} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 pt-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-sans text-frost/40">{label}</span>
      <span className="break-all text-cyan">{value}</span>
    </div>
  );
}
