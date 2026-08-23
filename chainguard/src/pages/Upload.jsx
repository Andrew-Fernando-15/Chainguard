import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiHash, FiLink, FiCheckCircle, FiX } from 'react-icons/fi';
import { sha256File, shortHash } from '../utils/hash';
import { mockUploadToBlockchain, uploadEvidence } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const STAGES = ['idle', 'hashing', 'hashed', 'chaining', 'done'];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [hash, setHash] = useState('');
  const [chainInfo, setChainInfo] = useState(null);
  const [meta, setMeta] = useState({ caseId: '', description: '', category: 'Video' });
  const inputRef = useRef(null);
  const { pushToast } = useToast();
  const { token } = useAuth();

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setStage('hashing');
    setProgress(0);
    setChainInfo(null);

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(90, p + Math.random() * 18));
    }, 150);

    const h = await sha256File(f);
    clearInterval(progressTimer);
    setProgress(100);
    setHash(h);
    setStage('hashed');
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const submitToChain = async () => {
    setStage('chaining');
    try {
      // REAL: saves to MongoDB AND commits the hash to the smart contract on Ganache.
      // If the contract hasn't been deployed yet, chainInfo comes back null and
      // we fall back to the mock so the UI still has something to show.
      const result = await uploadEvidence(
        { caseId: meta.caseId, category: meta.category, fileName: file.name, fileHash: hash, file: file },
        token
      );

      const chain = result.chainInfo || (await mockUploadToBlockchain(hash));
      setChainInfo(chain);
      setStage('done');
      pushToast(
        result.chainInfo
          ? 'Evidence saved and committed to the real blockchain.'
          : 'Evidence saved. (Blockchain not deployed yet — showing placeholder chain data.)',
        'success'
      );
    } catch (err) {
      setStage('hashed');
      const msg = err.response?.data?.error || 'Failed to save evidence. Is the backend running?';
      pushToast(msg, 'warning');
    }
  };

  const reset = () => {
    setFile(null); setStage('idle'); setProgress(0); setHash(''); setChainInfo(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Intake</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Upload Evidence</h1>
      <p className="mt-1 text-sm text-frost/50">Files are hashed locally in your browser before anything is stored.</p>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition-colors ${
            dragOver ? 'border-cyan bg-cyan/5' : 'border-white/15 hover:border-white/25'
          }`}
        >
          <FiUploadCloud className="text-4xl text-cyan" />
          <p className="mt-4 font-medium">Drag & drop a file here, or click to browse</p>
          <p className="mt-1 text-sm text-frost/40">Supports video, image, audio, and document evidence</p>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiFile className="text-2xl text-cyan" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-frost/40">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={reset} aria-label="Remove file" className="rounded-lg p-2 text-frost/40 hover:bg-white/5 hover:text-frost">
                <FiX />
              </button>
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-xs text-frost/50">
                <span className="flex items-center gap-1.5"><FiHash /> Generating SHA-256 hash</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-blue to-cyan transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <AnimatePresence>
              {hash && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-frost/40">SHA-256 Hash</p>
                  <p className="mt-1 break-all font-mono text-xs text-cyan">{hash}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex items-center gap-2 text-sm">
              <FiLink className={STAGES.indexOf(stage) >= 3 ? 'text-green' : 'text-frost/30'} />
              <span className={STAGES.indexOf(stage) >= 3 ? 'text-green' : 'text-frost/40'}>
                {stage === 'done' ? 'Committed to blockchain' : stage === 'chaining' ? 'Submitting to blockchain...' : 'Awaiting blockchain submission'}
              </span>
            </div>

            {chainInfo && (
              <div className="mt-3 space-y-1 rounded-xl bg-white/5 p-3 font-mono text-xs text-frost/60">
                <p>Tx Hash: <span className="text-cyan">{chainInfo.txHash}</span></p>
                <p>Contract: <span className="text-cyan">{chainInfo.contract}</span></p>
                <p>Block: <span className="text-cyan">#{chainInfo.block}</span></p>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); if (stage === 'hashed') submitToChain(); }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="font-semibold">Evidence Metadata</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-frost/50">Case ID</label>
                <input
                  required
                  value={meta.caseId}
                  onChange={(e) => setMeta({ ...meta, caseId: e.target.value })}
                  placeholder="CASE-2026-0417"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50"
                />
              </div>
              <div>
                <label className="text-xs text-frost/50">Category</label>
                <select
                  value={meta.category}
                  onChange={(e) => setMeta({ ...meta, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50"
                >
                  <option>Video</option>
                  <option>Image</option>
                  <option>Audio</option>
                  <option>Document</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-frost/50">Description</label>
                <textarea
                  required
                  rows={3}
                  value={meta.description}
                  onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                  placeholder="Brief context for this piece of evidence"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={stage !== 'hashed'}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-cyan px-4 py-2.5 text-sm font-medium text-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              {stage === 'chaining' ? 'Submitting to chain...' : stage === 'done' ? (
                <span className="flex items-center gap-2"><FiCheckCircle /> Submitted — {shortHash(hash)}</span>
              ) : 'Submit Evidence'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
