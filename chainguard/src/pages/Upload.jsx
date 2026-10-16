import { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiCheckCircle, FiX, FiLoader, FiFolder, FiFolderPlus, FiLayers, FiArrowLeft } from 'react-icons/fi';
import { sha256File, shortHash } from '../utils/hash';
import { uploadEvidence, getCaseFolders, createCaseFolder, listCases } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
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

export default function Upload() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Upload mode: 'multiple' (default / preferred) or 'single'
  const [uploadMode, setUploadMode] = useState('multiple');
  
  // Files: array of { id, file, hash, name, size, category }
  const [fileList, setFileList] = useState([]);
  
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | hashing | filling | uploading | chaining | done
  const [chainInfo, setChainInfo] = useState(null);
  
  // Auto-redirect timer state
  const [countdown, setCountdown] = useState(12);
  const [redirectCancelled, setRedirectCancelled] = useState(false);

  // Available cases
  const [cases, setCases] = useState([]);
  
  // Folders for current selected case
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('Root');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

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

  // Navigate back to the previous screen or case detail
  const handleGoBack = useCallback(() => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
      return;
    }
    if (meta.caseId) {
      const matchingCase = cases.find((c) => c.caseId === meta.caseId);
      if (matchingCase?._id) {
        navigate(`/case/${matchingCase._id}`);
        return;
      }
      navigate('/cases');
      return;
    }
    navigate(-1);
  }, [navigate, meta.caseId, cases]);

  // Auto-redirect countdown (10-15s, set to 12s) when upload completes
  useEffect(() => {
    if (stage !== 'done' || redirectCancelled) return;

    setCountdown(12);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleGoBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, redirectCancelled, handleGoBack]);

  // Load cases for easy case selection / auto-population
  useEffect(() => {
    if (!token) return;
    listCases(token)
      .then((data) => setCases(data || []))
      .catch(() => {});
  }, [token]);

  // Load folders whenever meta.caseId changes
  useEffect(() => {
    if (!token || !meta.caseId.trim()) {
      setFolders([]);
      setSelectedFolder('');
      return;
    }

    getCaseFolders(meta.caseId.trim(), token)
      .then((data) => {
        const validFolders = Array.isArray(data) ? data.filter((f) => f && f.toLowerCase() !== 'root' && f.toLowerCase() !== 'general') : [];
        setFolders(validFolders);
        // Default to first real folder if available
        if (validFolders.length > 0) {
          setSelectedFolder(validFolders[0]);
        } else {
          setSelectedFolder('Evidence_Vault');
        }
      })
      .catch(() => {
        setFolders([]);
        setSelectedFolder('Evidence_Vault');
      });
  }, [meta.caseId, token]);

  // Handle file addition (single or multiple)
  const processFiles = useCallback(async (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) return;
    const filesArray = Array.from(incomingFiles);

    const targetList = uploadMode === 'single' ? [filesArray[0]] : filesArray;

    setStage('hashing');
    setChainInfo(null);

    // Compute hash for each file
    const processed = [];
    for (let i = 0; i < targetList.length; i++) {
      const f = targetList[i];
      const h = await sha256File(f);
      processed.push({
        id: `${f.name}-${f.size}-${Date.now()}-${i}`,
        file: f,
        name: f.name,
        size: f.size,
        hash: h,
        category: guessCategory(f)
      });
    }

    setFileList((prev) => {
      const merged = uploadMode === 'single' ? processed : [...prev, ...processed];
      return merged;
    });

    // Auto-select title and category from first file if not already filled
    if (processed.length > 0) {
      setMeta((prev) => ({
        ...prev,
        category: prev.category === 'Miscellaneous' ? processed[0].category : prev.category,
        title: prev.title || processed[0].name.split('.').slice(0, -1).join('.')
      }));
    }

    setStage('filling');
  }, [uploadMode]);

  const removeFileItem = (id) => {
    setFileList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 0) {
        setStage('idle');
      }
      return updated;
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Folder dropdown change handler
  const handleFolderSelect = (val) => {
    if (val === '__CREATE_NEW__') {
      setShowNewFolderInput(true);
      setNewFolderName('');
    } else {
      setShowNewFolderInput(false);
      setSelectedFolder(val);
    }
  };

  // Create folder inside current case
  const handleCreateFolder = async (e) => {
    e?.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      pushToast('Please enter a folder name', 'warning');
      return;
    }
    if (trimmed.toLowerCase() === 'root') {
      pushToast('Cannot create folder named "Root"', 'warning');
      return;
    }
    if (!meta.caseId.trim()) {
      pushToast('Please specify a Case ID first', 'warning');
      return;
    }

    setCreatingFolder(true);
    try {
      const res = await createCaseFolder(meta.caseId.trim(), trimmed, token);
      const updatedList = res.folders || [...folders, trimmed];
      setFolders(updatedList);
      setSelectedFolder(trimmed);
      setShowNewFolderInput(false);
      setNewFolderName('');
      pushToast(`Folder "${trimmed}" created successfully`, 'success');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create folder';
      pushToast(msg, 'warning');
    } finally {
      setCreatingFolder(false);
    }
  };

  const submitEvidence = async () => {
    if (!meta.caseId.trim()) {
      pushToast('Case ID is required', 'warning');
      return;
    }
    if (fileList.length === 0) {
      pushToast('Please select at least one file to upload', 'warning');
      return;
    }

    setStage('uploading');
    try {
      let result;
      if (fileList.length === 1) {
        // Single file upload
        result = await uploadEvidence(
          {
            caseId: meta.caseId.trim(),
            folder: selectedFolder || 'Root',
            category: meta.category,
            title: meta.title,
            description: meta.description,
            collectedDate: meta.collectedDate,
            fileName: fileList[0].name,
            fileHash: fileList[0].hash,
            file: fileList[0].file,
          },
          token
        );
      } else {
        // Multiple files upload
        result = await uploadEvidence(
          {
            caseId: meta.caseId.trim(),
            folder: selectedFolder || 'Root',
            category: meta.category,
            title: meta.title,
            description: meta.description,
            collectedDate: meta.collectedDate,
            files: fileList.map((f) => ({
              file: f.file,
              name: f.name,
              hash: f.hash
            }))
          },
          token
        );
      }

      setStage('chaining');
      setTimeout(() => {
        const chain = result.chainInfo || (result.chainInfos && result.chainInfos[0]) || null;
        setChainInfo(chain);
        setStage('done');
        pushToast(
          `${fileList.length} evidence file${fileList.length > 1 ? 's' : ''} saved into folder "${selectedFolder || 'Root'}" and committed to blockchain.`,
          'success'
        );
      }, 500);
    } catch (err) {
      setStage('filling');
      const msg = err.response?.data?.error || 'Failed to save evidence. Is the backend running?';
      pushToast(msg, 'warning');
    }
  };

  const reset = () => {
    setFileList([]);
    setStage('idle');
    setChainInfo(null);
    setRedirectCancelled(false);
    setCountdown(12);
    setShowNewFolderInput(false);
    setNewFolderName('');
    setMeta({
      caseId: searchParams.get('caseId') || '',
      category: 'Miscellaneous',
      title: '',
      description: '',
      collectedDate: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Intake</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Upload Evidence</h1>
          <p className="mt-1 text-sm text-frost/50 light:text-navy/50">
            Files are cryptographically hashed locally before being encrypted and placed into case folders.
          </p>
        </div>

        {/* Upload Mode Toggle */}
        <div className="inline-flex rounded-xl bg-white/5 light:bg-navy/5 p-1 border border-white/10 light:border-navy/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setUploadMode('multiple');
              if (fileList.length > 1) {
                // keep multiple
              }
            }}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              uploadMode === 'multiple'
                ? 'bg-gradient-to-r from-blue to-cyan text-navy shadow-sm'
                : 'text-frost/60 light:text-navy/60 hover:text-frost light:hover:text-navy'
            }`}
          >
            <FiLayers /> Multiple Files (Preferred)
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode('single');
              if (fileList.length > 1) {
                setFileList([fileList[0]]);
              }
            }}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              uploadMode === 'single'
                ? 'bg-gradient-to-r from-blue to-cyan text-navy shadow-sm'
                : 'text-frost/60 light:text-navy/60 hover:text-frost light:hover:text-navy'
            }`}
          >
            <FiFile /> Single File
          </button>
        </div>
      </div>

      {fileList.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition-colors ${
            dragOver
              ? 'border-cyan bg-cyan/5'
              : 'border-white/15 light:border-navy/15 hover:border-white/25 light:hover:border-navy/25 bg-white/[0.02] light:bg-navy/[0.02]'
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan/10 text-cyan">
            <FiUploadCloud className="text-3xl" />
          </div>
          <p className="mt-4 text-base font-medium">
            {uploadMode === 'multiple'
              ? 'Drag & drop multiple files here, or click to browse'
              : 'Drag & drop a file here, or click to browse'}
          </p>
          <p className="mt-1 text-sm text-frost/40 light:text-navy/40">
            {uploadMode === 'multiple'
              ? 'Select multiple evidence documents, audio files, photos, or reports simultaneously'
              : 'Supports all standard evidence formats (PDF, JPG, PNG, MP4, DOCX)'}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple={uploadMode === 'multiple'}
            className="hidden"
            onChange={(e) => processFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* Metadata Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (stage === 'filling') submitEvidence();
            }}
            className="glass rounded-2xl p-6 lg:col-span-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/5 light:border-navy/10">
                <h3 className="font-semibold text-base">Evidence Metadata & Destination</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan/10 text-cyan font-mono">
                  {fileList.length} file{fileList.length > 1 ? 's' : ''} queued
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {/* Case ID Selection / Input */}
                <div>
                  <label className="text-xs text-frost/50 light:text-navy/50">Case ID *</label>
                  <div className="relative mt-1">
                    <input
                      required
                      list="case-suggestions"
                      value={meta.caseId}
                      onChange={(e) => setMeta({ ...meta, caseId: e.target.value })}
                      placeholder="e.g. CASE-10239 or CASE-2026-001"
                      className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
                      disabled={stage !== 'filling'}
                    />
                    <datalist id="case-suggestions">
                      {cases.map((c) => (
                        <option key={c.caseId} value={c.caseId}>
                          {c.caseId} — {c.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Folder Selection Dropdown (Requirements: Root, Existing folders, + Create New Folder) */}
                <div className="rounded-xl border border-white/10 light:border-navy/10 bg-white/[0.03] light:bg-navy/[0.03] p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-cyan">
                      <FiFolder className="text-sm" /> In which folder do you want to upload?
                    </label>
                    <span className="text-[11px] text-frost/40 light:text-navy/40">
                      Destination inside Case
                    </span>
                  </div>

                  <select
                    value={showNewFolderInput ? '__CREATE_NEW__' : selectedFolder}
                    onChange={(e) => handleFolderSelect(e.target.value)}
                    className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-slate-900 light:bg-white px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy cursor-pointer"
                    disabled={stage !== 'filling'}
                  >
                    {folders.length === 0 ? (
                      <option value="Evidence_Vault">📁 Evidence Vault</option>
                    ) : (
                      folders.map((folderName) => (
                        <option key={folderName} value={folderName}>
                          📁 {folderName.replace(/^\d+[\s_-]*/, '').replace(/_/g, ' ')}
                        </option>
                      ))
                    )}
                    <option value="__CREATE_NEW__" className="text-cyan font-semibold">
                      + Create New Folder
                    </option>
                  </select>

                  {/* Inline Create New Folder Input */}
                  {showNewFolderInput && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex gap-2"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Type new folder name (e.g. 01_Crime_Scene)"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateFolder();
                          }
                        }}
                        className="flex-1 rounded-lg border border-cyan/40 bg-white/5 light:bg-navy/5 px-3 py-1.5 text-xs outline-none text-frost light:text-navy placeholder:text-frost/30"
                      />
                      <button
                        type="button"
                        onClick={handleCreateFolder}
                        disabled={creatingFolder || !newFolderName.trim()}
                        className="flex items-center gap-1 rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-navy light:text-white transition-opacity disabled:opacity-50"
                      >
                        {creatingFolder ? <FiLoader className="animate-spin" /> : <FiFolderPlus />}
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewFolderInput(false);
                          setSelectedFolder('Root');
                        }}
                        className="rounded-lg bg-white/10 light:bg-navy/10 px-2.5 py-1.5 text-xs text-frost/60 hover:text-frost light:text-navy/60"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs text-frost/50 light:text-navy/50">Category</label>
                  <select
                    value={meta.category}
                    onChange={(e) => setMeta({ ...meta, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-slate-900 light:bg-white px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
                    disabled={stage !== 'filling'}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs text-frost/50 light:text-navy/50">
                    Title {fileList.length > 1 ? '(Base title for files)' : ''}
                  </label>
                  <input
                    required
                    value={meta.title}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                    placeholder="e.g. Primary Evidence Intake"
                    className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
                    disabled={stage !== 'filling'}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-frost/50 light:text-navy/50">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={meta.description}
                    onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                    placeholder="Brief context for this batch of evidence"
                    className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
                    disabled={stage !== 'filling'}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs text-frost/50 light:text-navy/50">Collected Date</label>
                  <input
                    type="date"
                    value={meta.collectedDate}
                    onChange={(e) => setMeta({ ...meta, collectedDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-3 py-2 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
                    disabled={stage !== 'filling'}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 light:border-navy/10">
              <button
                type="submit"
                disabled={stage !== 'filling' || fileList.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue to-cyan px-4 py-3 text-sm font-semibold text-navy shadow-lg shadow-cyan/20 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
              >
                {stage === 'uploading' ? (
                  <>
                    <FiLoader className="animate-spin" /> Uploading & Encrypting...
                  </>
                ) : stage === 'chaining' ? (
                  <>
                    <FiLoader className="animate-spin" /> Committing to Blockchain...
                  </>
                ) : (
                  <>
                    Submit Evidence ({fileList.length} File{fileList.length > 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Panel: Selected Files List & Preview */}
          <div className="glass rounded-2xl p-6 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/5 light:border-navy/10">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">Selected Files</h3>
                  <span className="text-xs text-frost/50 light:text-navy/50">
                    ({fileList.length})
                  </span>
                </div>
                {stage === 'filling' && (
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs text-frost/50 hover:text-rose-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Destination Folder Indicator */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-cyan/5 border border-cyan/20 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-cyan font-medium">
                  <FiFolder className="text-sm" />
                  <span>Target Folder: <strong className="font-semibold">{selectedFolder || 'Root'}</strong></span>
                </div>
                <span className="font-mono text-[11px] text-frost/50 light:text-navy/50">
                  {meta.caseId || 'No case'}
                </span>
              </div>

              {/* List of Selected Files */}
              <div className="mt-3 max-h-60 overflow-y-auto space-y-2 pr-1">
                {fileList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center justify-between rounded-xl border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 p-3 text-xs hover:border-cyan/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FiFile className="text-cyan text-base shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-medium truncate text-frost/90 light:text-navy/90">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-frost/40 light:text-navy/40 mt-0.5 font-mono">
                          <span>{(item.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="text-cyan/70">{shortHash(item.hash)}</span>
                        </div>
                      </div>
                    </div>

                    {stage === 'filling' && (
                      <button
                        type="button"
                        onClick={() => removeFileItem(item.id)}
                        className="rounded p-1 text-frost/40 hover:text-rose-400 hover:bg-white/5 transition-colors shrink-0"
                        title="Remove file"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add more files button in multiple mode */}
              {uploadMode === 'multiple' && stage === 'filling' && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 light:border-navy/20 py-2 text-xs text-frost/60 light:text-navy/60 hover:border-cyan/40 hover:text-cyan transition-colors"
                  >
                    + Add More Files
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => processFiles(e.target.files)}
                  />
                </div>
              )}
            </div>

            {/* Progress / Status Steps */}
            <div className="mt-6 border-t border-white/5 light:border-navy/10 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-xs">
                  {stage === 'hashing' ? (
                    <FiLoader className="animate-spin text-cyan text-sm" />
                  ) : (
                    <FiCheckCircle className="text-green text-sm" />
                  )}
                  <span className={stage === 'hashing' ? 'text-cyan font-medium' : 'text-frost/60 light:text-navy/60'}>
                    Cryptographic SHA-256 Hashed
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {stage === 'uploading' ? (
                    <FiLoader className="animate-spin text-cyan text-sm" />
                  ) : stage === 'chaining' || stage === 'done' ? (
                    <FiCheckCircle className="text-green text-sm" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-white/20 light:border-navy/20" />
                  )}
                  <span
                    className={
                      stage === 'uploading'
                        ? 'text-cyan font-medium'
                        : stage === 'chaining' || stage === 'done'
                        ? 'text-frost/60 light:text-navy/60'
                        : 'text-frost/30 light:text-navy/30'
                    }
                  >
                    AES-256 Encryption & Upload
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {stage === 'chaining' ? (
                    <FiLoader className="animate-spin text-cyan text-sm" />
                  ) : stage === 'done' ? (
                    <FiCheckCircle className="text-green text-sm" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-white/20 light:border-navy/20" />
                  )}
                  <span
                    className={
                      stage === 'chaining'
                        ? 'text-cyan font-medium'
                        : stage === 'done'
                        ? 'text-frost/60 light:text-navy/60'
                        : 'text-frost/30 light:text-navy/30'
                    }
                  >
                    Blockchain Smart Contract Commit
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {stage === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl bg-green/10 border border-green/20 p-3.5 font-mono text-xs text-frost/80 light:text-navy/80 space-y-2.5"
                  >
                    <p className="flex items-center gap-1.5 text-green font-sans font-semibold">
                      <FiCheckCircle className="text-base" /> Upload & Blockchain Verified!
                    </p>
                    <p className="text-[11px] text-frost/60 light:text-navy/60 font-sans">
                      Folder: <span className="text-cyan font-semibold">{selectedFolder || 'Root'}</span>
                    </p>
                    {chainInfo && (
                      <p className="break-all text-[11px]">
                        Tx: <span className="text-cyan">{chainInfo.txHash}</span>
                      </p>
                    )}

                    {/* Auto-redirect countdown & return buttons */}
                    <div className="rounded-lg bg-navy/60 light:bg-white/60 border border-white/10 light:border-navy/10 p-2.5 font-sans">
                      {!redirectCancelled ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-frost/80 light:text-navy/80 flex items-center gap-1.5 font-medium">
                              ⏱️ Taking you back in <span className="text-cyan font-mono font-bold text-sm">{countdown}s</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setRedirectCancelled(true)}
                              className="text-[11px] text-frost/50 hover:text-frost light:text-navy/50 light:hover:text-navy underline underline-offset-2"
                            >
                              Stay Here
                            </button>
                          </div>
                          
                          {/* Visual progress bar */}
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue to-cyan transition-all duration-1000 ease-linear rounded-full"
                              style={{ width: `${Math.max(0, (countdown / 12) * 100)}%` }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleGoBack}
                            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-blue to-cyan text-navy py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity mt-1"
                          >
                            <FiArrowLeft /> Return Now
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-frost/60 light:text-navy/60">Auto-redirect paused</span>
                          <button
                            type="button"
                            onClick={handleGoBack}
                            className="flex items-center gap-1 text-cyan font-medium hover:underline text-xs"
                          >
                            <FiArrowLeft /> Return Now
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={reset}
                      className="w-full rounded-lg bg-white/10 light:bg-navy/10 py-1.5 font-sans text-xs font-medium text-frost light:text-navy hover:bg-white/20 transition-colors"
                    >
                      Upload Another Batch
                    </button>
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
