import { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiHash, FiLink, FiCheckCircle, FiX, FiLoader } from 'react-icons/fi';
import { sha256File, shortHash } from '../utils/hash';
import { uploadEvidence } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Blood Sample', 'DNA Report', 'Fingerprint', 'Autopsy Report',
  'Toxicology Report', 'Ballistics Report', 'Murder Weapon',
  'Crime Scene Photos', 'Crime Scene Videos', 'Witness Statement',
  'Victim Statement', 'Accused Statement', 'CCTV Footage',
  'Mobile Phone Data', 'Call Detail Records', 'FIR Copy',
  'Charge Sheet', 'Medical Report', 'Other Physical Evidence',
  'Miscellaneous'
];

function guessCategory(file) {
  if (!file) return 'Miscellaneous';
  const type = file.type || '';
  const name = file.name.toLowerCase();
  
  if (name.includes('blood')) return 'Blood Sample';
  if (name.includes('dna')) return 'DNA Report';
  if (name.includes('fingerprint') || name.includes('print')) return 'Fingerprint';
  if (name.includes('autopsy')) return 'Autopsy Report';
  if (name.includes('toxicology')) return 'Toxicology Report';
  if (name.includes('ballistic')) return 'Ballistics Report';
  if (name.includes('weapon')) return 'Murder Weapon';
  if (name.includes('witness')) return 'Witness Statement';
  if (name.includes('victim')) return 'Victim Statement';
  if (name.includes('accused') || name.includes('suspect')) return 'Accused Statement';
  if (name.includes('cctv')) return 'CCTV Footage';
  if (name.includes('phone') || name.includes('mobile')) return 'Mobile Phone Data';
  if (name.includes('cdr') || name.includes('call')) return 'Call Detail Records';
  if (name.includes('fir')) return 'FIR Copy';
  if (name.includes('charge')) return 'Charge Sheet';
  if (name.includes('medical')) return 'Medical Report';
  
  if (type.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.avi')) return 'Crime Scene Videos';
  if (type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.png')) return 'Crime Scene Photos';
  
  return 'Miscellaneous';
}

const STAGES = ['idle', 'hashing', 'filling', 'uploading', 'chaining', 'done'];

export default function Upload() {
  const [searchParams] = useSearchParams();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState('idle');
  const [hash, setHash] = useState('');
  const [chainInfo, setChainInfo] = useState(null);
  
  const [meta, setMeta] = useState({
    caseId: searchParams.get('caseId') || '',
    category: 'Miscellaneous',
    title: '',
    description: '',
    collectedDate: new Date().toISOString().split('T')[0]
  });

  const inputRef = useRef(null);
  const { pushToast } = useToast();
  const { token } = useAuth();

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setStage('hashing');
    setChainInfo(null);
    setHash('');
    
    // Auto-select category and title
    setMeta(prev => ({
      ...prev,
      category: guessCategory(f),
      title: f.name.split('.').slice(0, -1).join('.') // default title to filename without ext
    }));

    const h = await sha256File(f);
    setHash(h);
    setStage('filling');
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const submitEvidence = async () => {
    setStage('uploading');
    try {
      // 1. Uploading to backend (MongoDB)
      // 2. Writing to Blockchain happens in the backend handler
      // We'll show uploading briefly, but it's one API call
      const result = await uploadEvidence(
        { 
          caseId: meta.caseId, 
          category: meta.category, 
          title: meta.title, 
          description: meta.description, 
          collectedDate: meta.collectedDate, 
          fileName: file.name, 
          fileHash: hash, 
          file: file 
        },
        token
      );

      // Transition to chaining (even though backend already did it, we show the progress for UX)
      setStage('chaining');
      setTimeout(() => {
        const chain = result.chainInfo || null;
        setChainInfo(chain);
        setStage('done');
        pushToast(
          result.chainInfo
            ? 'Evidence saved and committed to the blockchain.'
            : 'Evidence saved. Blockchain commit pending.',
          'success'
        );
      }, 500); // slight UX delay to let user see "Writing to Blockchain..."
    } catch (err) {
      setStage('filling');
      const msg = err.response?.data?.error || 'Failed to save evidence. Is the backend running?';
      pushToast(msg, 'warning');
    }
  };

  const reset = () => {
    setFile(null); setStage('idle'); setHash(''); setChainInfo(null);
    setMeta({ caseId: searchParams.get('caseId') || '', category: 'Miscellaneous', title: '', description: '', collectedDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Intake</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Upload Evidence</h1>
      <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Files are hashed locally in your browser before anything is stored.</p>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition-colors ${
            dragOver ? 'border-cyan bg-cyan/5' : 'border-white/15 light:border-navy/15 hover:border-white/25 light:border-navy/25'
          }`}
        >
          <FiUploadCloud className="text-4xl text-cyan" />
          <p className="mt-4 font-medium">Drag & drop a file here, or click to browse</p>
          <p className="mt-1 text-sm text-frost/40 light:text-navy/40">Supports all standard evidence formats</p>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          
          {/* Metadata Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (stage === 'filling') submitEvidence(); }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="font-semibold">Evidence Metadata</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-frost/50 light:text-navy/50">Case ID</label>
                <input
                  required
                  value={meta.caseId}
                  onChange={(e) => setMeta({ ...meta, caseId: e.target.value })}
                  placeholder="CASE-2026-001"
                  className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50"
                  disabled={stage !== 'filling'}
                />
              </div>
              <div>
                <label className="text-xs text-frost/50 light:text-navy/50">Category</label>
                <select
                  value={meta.category}
                  onChange={(e) => setMeta({ ...meta, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
                  disabled={stage !== 'filling'}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white light:bg-white light:text-navy">{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-frost/50 light:text-navy/50">Title</label>
                <input
                  required
                  value={meta.title}
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                  placeholder="e.g. Primary Suspect Interview"
                  className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50"
                  disabled={stage !== 'filling'}
                />
              </div>
              <div>
                <label className="text-xs text-frost/50 light:text-navy/50">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={meta.description}
                  onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                  placeholder="Brief context for this piece of evidence"
                  className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50"
                  disabled={stage !== 'filling'}
                />
              </div>
              <div>
                <label className="text-xs text-frost/50 light:text-navy/50">Collected Date (Optional)</label>
                <input
                  type="date"
                  value={meta.collectedDate}
                  onChange={(e) => setMeta({ ...meta, collectedDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
                  disabled={stage !== 'filling'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={stage !== 'filling'}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-cyan px-4 py-2.5 text-sm font-medium text-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit Evidence
            </button>
          </form>

          {/* Status & Preview Panel */}
          <div className="glass rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Preview & Progress</h3>
              {stage === 'filling' && (
                <button onClick={reset} aria-label="Remove file" className="rounded-lg p-2 text-frost/40 light:text-navy/40 hover:bg-white/5 light:bg-navy/5 hover:text-frost light:text-navy">
                  <FiX />
                </button>
              )}
            </div>

            {/* Preview Summary */}
            <div className="mt-4 rounded-xl border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 p-4 text-sm">
              <div className="flex items-center gap-3 mb-3">
                <FiFile className="text-2xl text-cyan" />
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-frost/40 light:text-navy/40">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              
              <div className="space-y-2 border-t border-white/10 light:border-navy/10 pt-3">
                <div className="flex justify-between">
                  <span className="text-xs text-frost/50 light:text-navy/50">Case</span>
                  <span className="text-xs font-medium text-frost/80 light:text-navy/80">{meta.caseId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-frost/50 light:text-navy/50">Category</span>
                  <span className="text-xs font-medium text-cyan">{meta.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-frost/50 light:text-navy/50">Hash</span>
                  <span className="text-xs font-mono text-cyan truncate ml-2">
                    {stage === 'hashing' ? 'Generating...' : shortHash(hash)}
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            <div className="mt-6 flex-1">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {stage === 'hashing' ? <FiLoader className="animate-spin text-cyan" /> : <FiCheckCircle className="text-green" />}
                  <span className={stage === 'hashing' ? 'text-cyan' : 'text-frost/50 light:text-navy/50'}>
                    Generating SHA-256 Hash
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {stage === 'uploading' ? (
                    <FiLoader className="animate-spin text-cyan" />
                  ) : stage === 'chaining' || stage === 'done' ? (
                    <FiCheckCircle className="text-green" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20 light:border-navy/20" />
                  )}
                  <span className={stage === 'uploading' ? 'text-cyan' : stage === 'chaining' || stage === 'done' ? 'text-frost/50 light:text-navy/50' : 'text-frost/30 light:text-navy/30'}>
                    Uploading to server...
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {stage === 'chaining' ? (
                    <FiLoader className="animate-spin text-cyan" />
                  ) : stage === 'done' ? (
                    <FiCheckCircle className="text-green" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20 light:border-navy/20" />
                  )}
                  <span className={stage === 'chaining' ? 'text-cyan' : stage === 'done' ? 'text-frost/50 light:text-navy/50' : 'text-frost/30 light:text-navy/30'}>
                    Writing to Blockchain...
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {stage === 'done' && chainInfo && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-1 rounded-xl bg-white/5 light:bg-navy/5 p-3 font-mono text-xs text-frost/60 light:text-navy/60">
                    <p className="flex items-center gap-2 text-green mb-2 font-sans font-medium"><FiCheckCircle /> Success</p>
                    <p className="break-all">Tx Hash: <span className="text-cyan">{chainInfo.txHash}</span></p>
                    <p className="break-all">Contract: <span className="text-cyan">{chainInfo.contract}</span></p>
                    <p>Block: <span className="text-cyan">#{chainInfo.block}</span></p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
