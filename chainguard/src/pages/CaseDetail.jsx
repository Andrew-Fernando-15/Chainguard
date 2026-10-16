import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiLoader, FiShield, FiDownload, FiEye, FiUserPlus, FiX,
  FiSearch, FiFolder, FiFolderPlus, FiGrid, FiList,
  FiFile, FiFileText, FiImage, FiVideo, FiMusic, FiPlus, FiLayers, FiCheck
} from 'react-icons/fi';
import {
  getCase, listCaseEvidence, downloadEvidence, viewEvidence,
  updateCaseStatus, reopenCase, getUsers, assignCase, createCaseFolder
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_STYLE = {
  Verified: 'text-green bg-green/10',
  Pending: 'text-cyan bg-cyan/10',
  Flagged: 'text-orange-400 bg-orange-400/10',
  Active: 'text-blue bg-blue/10',
  Closed: 'text-frost/60 light:text-navy/60 bg-white/10 light:bg-navy/10',
};

// Folder color palettes inspired by user reference image
const FOLDER_THEMES = [
  {
    cover: 'from-amber-500 via-orange-500 to-amber-600',
    accent: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  },
  {
    cover: 'from-blue-600 via-indigo-600 to-blue-700',
    accent: 'text-cyan',
    badge: 'bg-cyan/20 text-cyan border-cyan/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  },
  {
    cover: 'from-rose-500 via-red-500 to-orange-500',
    accent: 'text-rose-300',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]',
  },
  {
    cover: 'from-emerald-600 via-teal-600 to-emerald-800',
    accent: 'text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  },
  {
    cover: 'from-purple-600 via-violet-600 to-indigo-700',
    accent: 'text-purple-300',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
  },
  {
    cover: 'from-teal-700 via-slate-800 to-slate-900',
    accent: 'text-teal-300',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]',
  },
];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // Folder Explorer State
  const [activeFolder, setActiveFolder] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [fileSearch, setFileSearch] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [cData, eData] = await Promise.all([
          getCase(id, token),
          listCaseEvidence(id, token)
        ]);
        if (!cancelled) {
          setCaseData(cData);
          setEvidence(eData || []);
          setSelectedUsers(cData.allottedTo || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load case data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, token]);

  const handleDownload = async (e, row) => {
    e.stopPropagation();
    try {
      await downloadEvidence(row._id, token);
    } catch (err) {
      console.error('Download failed', err);
      alert(err.response?.data?.error || 'Download failed. You might not have permission.');
    }
  };

  const handleView = async (e, row) => {
    e.stopPropagation();
    try {
      await viewEvidence(row._id, token);
    } catch (err) {
      console.error('View failed', err);
      alert(err.response?.data?.error || 'View failed.');
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await updateCaseStatus(id, newStatus, token);
      setCaseData({ ...caseData, status: newStatus });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleReopenCase = async () => {
    if (!window.confirm("Are you sure you want to reopen this closed case? This is a critical action and will be logged.")) return;
    setIsReopening(true);
    try {
      await reopenCase(id, token);
      setCaseData({ ...caseData, status: 'Active' });
      alert("Case successfully reopened!");
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reopen case');
    } finally {
      setIsReopening(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e?.preventDefault();
    const trimmed = newFolderName.trim().replace(/\s+/g, '_');
    if (!trimmed) return alert('Please enter a folder name');
    if (trimmed.toLowerCase() === 'general' || trimmed.toLowerCase() === 'root') {
      return alert('Cannot use reserved folder name');
    }
    try {
      setCreatingFolder(true);
      const res = await createCaseFolder(caseData.caseId, trimmed, token);
      setCaseData(prev => ({
        ...prev,
        folders: res.folders || [...(prev.folders || []), trimmed]
      }));
      setActiveFolder(trimmed);
      setNewFolderName('');
      setShowNewFolderModal(false);
      alert(`Folder "${trimmed.replace(/_/g, ' ')}" created successfully!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const openAssignModal = async () => {
    setShowAssignModal(true);
    setSearchQuery('');
    if (allUsers.length === 0) {
      try {
        setLoadingUsers(true);
        const users = await getUsers(token);
        setAllUsers(users);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const toggleUserSelection = (userName) => {
    setSelectedUsers(prev =>
      prev.includes(userName)
        ? prev.filter(n => n !== userName)
        : [...prev, userName]
    );
  };

  const handleAssignSubmit = async () => {
    try {
      setAssigning(true);
      const updated = await assignCase(id, selectedUsers, token);
      setCaseData(updated.case);
      setShowAssignModal(false);
      alert("Officers successfully assigned!");
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign case');
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.position.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  // Group evidence by folder, ensuring no 'General' or 'Root'
  const groupedEvidence = useMemo(() => {
    const groups = {};
    const caseFolders = (caseData?.folders && Array.isArray(caseData.folders))
      ? caseData.folders.map(f => f.trim()).filter(f => f && f.toLowerCase() !== 'root' && f.toLowerCase() !== 'general')
      : [];

    caseFolders.forEach((folderName) => {
      groups[folderName] = [];
    });

    if (Array.isArray(evidence)) {
      evidence.forEach((item) => {
        const folderKey = (item.folder || '').trim();
        if (folderKey && folderKey.toLowerCase() !== 'root' && folderKey.toLowerCase() !== 'general') {
          if (!groups[folderKey]) {
            groups[folderKey] = [];
          }
          groups[folderKey].push(item);
        } else if (caseFolders.length > 0) {
          groups[caseFolders[0]].push(item);
        }
      });
    }

    const sortedFolderNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return { groups, sortedFolderNames };
  }, [evidence, caseData]);

  // Filtered evidence for active folder & search query
  const displayedEvidence = useMemo(() => {
    let list = [];
    if (activeFolder === 'ALL') {
      list = evidence;
    } else {
      list = groupedEvidence.groups[activeFolder] || [];
    }

    if (fileSearch.trim()) {
      const q = fileSearch.toLowerCase();
      list = list.filter(item =>
        (item.fileName && item.fileName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFolder, evidence, groupedEvidence, fileSearch]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-frost/50 light:text-navy/50">
        <FiLoader className="animate-spin" /> Loading case details...
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-12">
        <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-2 text-sm text-cyan hover:underline">
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 p-6 text-orange-300">
          <h2 className="text-lg font-semibold flex items-center gap-2"><FiShield /> Access Denied</h2>
          <p className="mt-2">{error || 'Case not found'}</p>
        </div>
      </div>
    );
  }

  const canChangeStatus = user?.position === 'Judge' || user?.position === 'CBI' || user?.role === 'Investigating Officer';
  const isForensic = user?.position === 'Forensic';

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-2 text-sm text-cyan hover:underline">
        <FiArrowLeft /> Back to Dashboard
      </button>

      {/* Case Header Details */}
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">{caseData.caseId}</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{caseData.name}</h1>
          <p className="mt-1 text-sm text-frost/50 light:text-navy/50">
            Allotted To: {caseData.allottedTo && caseData.allottedTo.length > 0 ? caseData.allottedTo.join(', ') : 'Unassigned'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          {canChangeStatus ? (
            <select
              value={caseData.status}
              onChange={handleStatusChange}
              className={`rounded-xl px-3 py-2 text-sm outline-none cursor-pointer border border-white/10 light:border-navy/10 ${STATUS_STYLE[caseData.status] || STATUS_STYLE.Pending}`}
            >
              <option value="Pending" className="bg-navy text-white">Pending</option>
              <option value="Active" className="bg-navy text-white">Active</option>
              <option value="Closed" className="bg-navy text-white">Closed</option>
            </select>
          ) : (
            <span className={`rounded-full px-3 py-1 text-sm uppercase ${STATUS_STYLE[caseData.status] || STATUS_STYLE.Pending}`}>
              {caseData.status}
            </span>
          )}

          <div className="flex gap-2 flex-wrap">
            {user?.position === 'CBI' && (
              <button
                onClick={openAssignModal}
                className="rounded-lg bg-white/10 light:bg-navy/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <FiUserPlus /> Assign Case
              </button>
            )}

            {caseData.status === 'Closed' && (user?.position === 'Judge' || user?.position === 'CBI') && (
              <button
                onClick={handleReopenCase}
                disabled={isReopening}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isReopening ? 'bg-orange-500/50 text-white cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20'
                }`}
              >
                {isReopening ? 'Reopening...' : 'Reopen Case'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Evidence Vault Section */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 light:border-navy/10 flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FiFolder className="text-cyan" /> Case Evidence Vault
            </h3>
            <p className="text-xs text-frost/50 light:text-navy/50 mt-0.5">
              {groupedEvidence.sortedFolderNames.length} forensic folders • {evidence.length} total evidence files
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {caseData.status !== 'Closed' && (
              <>
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="rounded-lg border border-cyan/30 bg-cyan/10 px-3.5 py-2 text-xs font-semibold text-cyan hover:bg-cyan/20 transition-colors flex items-center gap-1.5"
                >
                  <FiFolderPlus size={15} /> New Folder
                </button>
                <button
                  onClick={() => navigate(`/upload?caseId=${caseData.caseId}${activeFolder !== 'ALL' ? `&folder=${activeFolder}` : ''}`)}
                  className="rounded-lg bg-cyan px-4 py-2 text-xs font-semibold text-navy light:text-white hover:bg-cyan/80 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <FiPlus size={15} /> Upload Evidence
                </button>
              </>
            )}
          </div>
        </div>

        {/* 1. Folders Visual Directory Cards (matching reference image!) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan/70 font-semibold flex items-center gap-1.5">
              <FiLayers /> Folders Directory
            </span>
            <span className="text-xs text-frost/40 light:text-navy/40">
              Select a folder to view its contents
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* "All Evidence" Folder Card */}
            <FolderCard
              name="All Evidence"
              items={evidence}
              isSelected={activeFolder === 'ALL'}
              onClick={() => setActiveFolder('ALL')}
              index={1}
              isAll
            />

            {/* Case Designated Folder Cards */}
            {groupedEvidence.sortedFolderNames.map((fName, idx) => (
              <FolderCard
                key={fName}
                name={fName}
                items={groupedEvidence.groups[fName] || []}
                isSelected={activeFolder === fName}
                onClick={() => setActiveFolder(fName)}
                index={idx}
              />
            ))}
          </div>
        </div>

        {/* 2. Active Folder Header & Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3 p-3 rounded-xl bg-white/5 light:bg-navy/5 border border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-frost/40 light:text-navy/40 font-mono">Current Folder:</span>
            <span className="text-sm font-semibold text-cyan flex items-center gap-1.5 font-mono">
              <FiFolder size={15} />
              {activeFolder === 'ALL' ? 'All Evidence' : activeFolder.replace(/^\d+[\s_-]*/, '').replace(/_/g, ' ')}
            </span>
            <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[11px] font-mono text-cyan font-bold">
              {displayedEvidence.length} {displayedEvidence.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-frost/40 text-xs" />
              <input
                type="text"
                placeholder="Search in folder..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-36 sm:w-52 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-cyan/50 text-frost light:text-navy placeholder:text-frost/30"
              />
            </div>

            {/* View Mode Toggle: [ File Cards | Table List ] */}
            <div className="flex items-center bg-white/5 light:bg-navy/5 rounded-lg p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-cyan text-navy font-bold shadow-sm'
                    : 'text-frost/50 hover:text-frost'
                }`}
                title="Visual File Cards"
              >
                <FiGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-cyan text-navy font-bold shadow-sm'
                    : 'text-frost/50 hover:text-frost'
                }`}
                title="Detailed Table View"
              >
                <FiList size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Evidence Files Display: "If file then file like" (Cards Grid or Table) */}
        {displayedEvidence.length === 0 ? (
          <div className="py-14 text-center rounded-2xl border border-dashed border-white/10 light:border-navy/10 p-8">
            <FiFile className="mx-auto text-4xl text-frost/30 mb-2" />
            <p className="text-sm font-medium text-frost/70">No files found in this folder</p>
            {caseData.status !== 'Closed' && (
              <button
                onClick={() => navigate(`/upload?caseId=${caseData.caseId}${activeFolder !== 'ALL' ? `&folder=${activeFolder}` : ''}`)}
                className="mt-3 text-xs text-cyan hover:underline font-semibold"
              >
                + Upload files into this folder
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* "If file then file like" - Visual Document Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedEvidence.map((row) => (
              <FileCard
                key={row._id}
                row={row}
                onDownload={handleDownload}
                onView={handleView}
                isForensic={isForensic}
              />
            ))}
          </div>
        ) : (
          /* Detailed Table View */
          <div className="overflow-x-auto rounded-xl border border-white/5 light:border-navy/5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-frost/40 light:text-navy/40 border-b border-white/5 light:border-navy/5 bg-white/[0.02]">
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">File Name</th>
                  <th className="py-3 px-4 font-medium">Folder</th>
                  <th className="py-3 px-4 font-medium">Size</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Date Added</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 light:divide-navy/5">
                {displayedEvidence.map((row) => (
                  <motion.tr
                    key={row._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 light:hover:bg-navy/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-cyan/90 font-medium">{row.category}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-frost/90 light:text-navy/90">{row.fileName}</div>
                      {row.title && row.title !== row.fileName && (
                        <div className="text-xs text-frost/50 light:text-navy/50">{row.title}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-frost/60">
                      {row.folder ? row.folder.replace(/_/g, ' ') : 'Vault'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-frost/50 light:text-navy/50">
                      {row.fileSize ? `${(row.fileSize / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                          STATUS_STYLE[row.status] || STATUS_STYLE.Pending
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-frost/40 light:text-navy/40">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(row._id);
                            alert(`Evidence ID copied: ${row._id}`);
                          }}
                          className="text-frost/50 hover:text-cyan transition-colors text-xs font-mono"
                          title="Copy Evidence ID"
                        >
                          Copy ID
                        </button>
                        <button
                          onClick={(e) => handleView(e, row)}
                          className="rounded-lg p-1.5 text-cyan hover:bg-cyan/10 transition-colors"
                          title="View Evidence Inline"
                        >
                          <FiEye size={16} />
                        </button>
                        {!isForensic && (
                          <button
                            onClick={(e) => handleDownload(e, row)}
                            className="rounded-lg p-1.5 text-cyan hover:bg-cyan/10 transition-colors"
                            title="Download Evidence"
                          >
                            <FiDownload size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline Create Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl w-full max-w-md p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FiFolderPlus className="text-cyan" /> Create Case Folder
                </h3>
                <button onClick={() => setShowNewFolderModal(false)} className="text-frost/50 hover:text-white">
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-frost/70 mb-1">
                    Folder Name (e.g. CCTV_Footage, Forensic_Disk, Interrogation)
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-sm outline-none focus:border-cyan/50 text-frost"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingFolder}
                    className="px-5 py-2 rounded-lg bg-cyan text-navy text-xs font-semibold hover:bg-cyan/80 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creatingFolder ? <FiLoader className="animate-spin" /> : <FiCheck />} Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Case Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Assign Officers</h3>
                <button onClick={() => setShowAssignModal(false)} className="text-frost/50 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>

              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-frost/40" />
                <input
                  type="text"
                  placeholder="Search by name or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm outline-none focus:border-cyan/50"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 min-h-[250px] space-y-2">
                {loadingUsers ? (
                  <div className="flex h-full items-center justify-center text-frost/50">
                    <FiLoader className="animate-spin mr-2" /> Fetching officers...
                  </div>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <label
                      key={u._id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedUsers.includes(u.name)
                          ? 'border-cyan/50 bg-cyan/10'
                          : 'border-white/5 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-cyan"
                        checked={selectedUsers.includes(u.name)}
                        onChange={() => toggleUserSelection(u.name)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-frost/50">{u.position} • {u.role}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-center text-frost/50 mt-10">No users found</div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignSubmit}
                  disabled={assigning}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-cyan px-6 py-2 text-sm font-medium text-navy transition-opacity disabled:opacity-50"
                >
                  {assigning ? <><FiLoader className="animate-spin" /> Assigning...</> : 'Assign Selected Officers'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------
// Visual Folder Card Component (Matching Reference Image!)
// -------------------------------------------------------------
function FolderCard({ name, items, isSelected, onClick, index = 0, isAll = false }) {
  const theme = isAll 
    ? {
        cover: 'from-blue-600 via-indigo-600 to-cyan-700',
        accent: 'text-cyan',
        badge: 'bg-cyan/20 text-cyan border-cyan/30',
        glow: 'group-hover:shadow-[0_0_20px_rgba(6,182,212,0.35)]',
      }
    : FOLDER_THEMES[index % FOLDER_THEMES.length];

  const fileCount = items.length;
  const totalBytes = items.reduce((sum, item) => sum + (item.fileSize || 0), 0);
  const sizeFormatted = totalBytes > 1048576
    ? `${(totalBytes / 1048576).toFixed(1)} MB`
    : totalBytes > 0
    ? `${(totalBytes / 1024).toFixed(0)} KB`
    : 'Empty';

  const cleanName = isAll ? 'All Evidence' : name.replace(/^\d+[\s_-]*/, '').replace(/_/g, ' ');

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer select-none transition-all duration-300 transform hover:-translate-y-1.5 ${
        isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
      }`}
    >
      {/* Folder Tab at Top */}
      <div className="relative pt-3.5">
        <div
          className={`absolute top-0 left-3 h-5 w-16 sm:w-20 rounded-t-lg bg-gradient-to-r ${theme.cover} opacity-90 transition-opacity`}
        />

        {/* Back Cover plate */}
        <div
          className={`relative h-32 rounded-2xl bg-gradient-to-br ${theme.cover} p-1 shadow-lg transition-all ${theme.glow} ${
            isSelected ? 'ring-2 ring-cyan shadow-[0_0_22px_rgba(6,182,212,0.45)]' : ''
          }`}
        >
          {/* Peeking Document Sheets (like reference image!) */}
          <div className="absolute inset-x-3 -top-2 flex justify-center gap-1.5 transition-transform duration-300 group-hover:-translate-y-2 pointer-events-none">
            {/* Sheet 1 (back slightly angled) */}
            <div className="h-9 w-16 sm:w-20 rounded-t-md bg-white/70 shadow-sm transform -rotate-3 border border-white/40" />
            {/* Sheet 2 (front center with document lines) */}
            <div className="h-11 w-20 sm:w-24 rounded-t-md bg-white/95 shadow-md flex flex-col justify-start p-1.5 gap-1 border border-white">
              <div className="h-1 w-8 bg-slate-300 rounded-full" />
              <div className="h-1 w-12 bg-slate-200 rounded-full" />
            </div>
          </div>

          {/* Front Pocket Jacket */}
          <div className="relative h-full w-full rounded-xl bg-slate-950/45 backdrop-blur-md border border-white/20 p-3.5 flex flex-col justify-between overflow-hidden">
            {/* Folder Header */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-lg bg-white/10 ${theme.accent}`}>
                  <FiFolder size={16} />
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${theme.badge}`}>
                  {fileCount} {fileCount === 1 ? 'file' : 'files'}
                </span>
              </div>
              {isSelected && (
                <span className="flex items-center gap-0.5 rounded-full bg-cyan px-1.5 py-0.5 text-[9px] font-bold text-navy shadow-sm">
                  Active
                </span>
              )}
            </div>

            {/* Folder Title & Details */}
            <div className="relative z-10 mt-auto">
              <h4 className="font-semibold text-xs sm:text-sm text-white tracking-tight line-clamp-1 group-hover:text-cyan transition-colors" title={cleanName}>
                {cleanName}
              </h4>
              <div className="flex items-center justify-between text-[10px] text-white/60 font-mono mt-0.5">
                <span>{sizeFormatted}</span>
                <span className="text-cyan group-hover:underline">Open →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Visual File Card Component ("If file then file like!")
// -------------------------------------------------------------
function FileCard({ row, onDownload, onView, isForensic }) {
  const ext = (row.fileName || '').split('.').pop().toLowerCase();

  const typeConfig = {
    pdf: { label: 'PDF', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: FiFileText },
    jpg: { label: 'IMG', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: FiImage },
    jpeg: { label: 'IMG', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: FiImage },
    png: { label: 'IMG', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: FiImage },
    mp4: { label: 'VID', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: FiVideo },
    avi: { label: 'VID', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: FiVideo },
    mp3: { label: 'AUD', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: FiMusic },
    wav: { label: 'AUD', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: FiMusic },
  }[ext] || { label: 'DOC', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: FiFile };

  const IconComponent = typeConfig.icon;
  const sizeFormatted = row.fileSize ? `${(row.fileSize / 1024).toFixed(1)} KB` : '—';
  const shortHash = row.fileHash ? `${row.fileHash.slice(0, 8)}...${row.fileHash.slice(-6)}` : 'On-Chain';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl border border-white/10 light:border-navy/10 bg-white/[0.03] light:bg-navy/[0.03] hover:border-cyan/40 p-4 transition-all duration-200 hover:shadow-lg hover:shadow-cyan/5 flex flex-col justify-between overflow-hidden"
    >
      {/* Dog-ear corner fold (document-like aesthetic!) */}
      <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden rounded-tr-2xl pointer-events-none">
        <div className="w-8 h-8 bg-white/15 light:bg-navy/15 border-b border-l border-white/20 transform rotate-45 -translate-y-4 translate-x-4 shadow-sm" />
      </div>

      {/* Top Meta: Category & Format Badge */}
      <div className="flex items-center justify-between gap-2 pr-4 mb-3">
        <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold border ${typeConfig.bg}`}>
          {typeConfig.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[row.status] || STATUS_STYLE.Pending}`}>
          {row.status}
        </span>
      </div>

      {/* File Icon & Name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2.5 rounded-xl bg-white/5 light:bg-navy/5 text-cyan border border-white/10 group-hover:scale-105 transition-transform flex-shrink-0">
          <IconComponent size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="font-semibold text-sm text-frost/95 light:text-navy/95 truncate group-hover:text-cyan transition-colors" title={row.fileName}>
            {row.fileName}
          </h5>
          <p className="text-xs text-cyan/80 font-medium truncate mt-0.5">
            {row.category}
          </p>
          {row.title && row.title !== row.fileName && (
            <p className="text-[11px] text-frost/40 light:text-navy/40 truncate">
              {row.title}
            </p>
          )}
        </div>
      </div>

      {/* Evidence Technical Details */}
      <div className="rounded-xl bg-black/25 light:bg-navy/5 p-2.5 space-y-1 text-[11px] font-mono text-frost/50 light:text-navy/50 border border-white/5 mb-3">
        <div className="flex justify-between items-center">
          <span>Size: <strong className="text-frost/80 light:text-navy/80">{sizeFormatted}</strong></span>
          <span>{new Date(row.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-white/5 text-[10px]">
          <span className="flex items-center gap-1 text-green" title="Verified against SHA-256 on blockchain">
            <FiShield size={11} /> Hash:
          </span>
          <span className="text-cyan/70 font-mono truncate max-w-[130px]">{shortHash}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(row._id);
            alert(`Evidence ID copied: ${row._id}`);
          }}
          className="flex-1 py-1.5 rounded-lg border border-white/10 hover:border-cyan/40 bg-white/5 hover:bg-white/10 text-[11px] font-medium text-frost/70 hover:text-cyan transition-colors text-center"
          title="Copy ID for verification"
        >
          Copy ID
        </button>

        <button
          onClick={(e) => onView(e, row)}
          className="p-1.5 rounded-lg bg-cyan/10 hover:bg-cyan/20 text-cyan transition-colors"
          title="Inspect / View inline"
        >
          <FiEye size={15} />
        </button>

        {!isForensic && (
          <button
            onClick={(e) => onDownload(e, row)}
            className="p-1.5 rounded-lg bg-cyan text-navy hover:bg-cyan/80 font-semibold transition-colors"
            title="Download Decrypted Evidence"
          >
            <FiDownload size={15} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
