import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLoader, FiShield, FiDownload, FiEye, FiUserPlus, FiX, FiSearch } from 'react-icons/fi';
import { getCase, listCaseEvidence, downloadEvidence, viewEvidence, updateCaseStatus, reopenCase, getUsers, assignCase } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_STYLE = {
  Verified: 'text-green bg-green/10',
  Pending: 'text-cyan bg-cyan/10',
  Flagged: 'text-orange-400 bg-orange-400/10',
  Active: 'text-blue bg-blue/10',
  Closed: 'text-frost/60 light:text-navy/60 bg-white/10 light:bg-navy/10',
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [caseData, setCaseData] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // Modal State
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

      <div className="mb-8 flex items-end justify-between">
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

          <div className="flex gap-2">
            {user?.position === 'CBI' && (
              <button 
                onClick={openAssignModal}
                className="rounded-lg bg-white/10 light:bg-navy/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 light:bg-navy/20 transition-colors flex items-center gap-2"
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

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Case Evidence</h3>
          {caseData.status !== 'Closed' && (
            <button onClick={() => navigate(`/upload?caseId=${caseData.caseId}`)} className="rounded-lg bg-white/10 light:bg-navy/10 px-4 py-2 text-sm text-white hover:bg-white/20 light:bg-navy/20 transition-colors">
              Upload New Evidence
            </button>
          )}
        </div>

        {evidence.length === 0 ? (
          <p className="mt-4 text-sm text-frost/40 light:text-navy/40">No evidence found in this case.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-frost/40 light:text-navy/40">
                  <th className="pb-3">Category</th>
                  <th className="pb-3">File Name</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date Added</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 light:divide-navy/5">
                {evidence.map((row) => (
                  <motion.tr key={row._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/5 light:bg-navy/5 cursor-pointer">
                    <td className="py-3 text-cyan/80">{row.category}</td>
                    <td className="py-3">{row.fileName}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS_STYLE[row.status] || STATUS_STYLE.Pending}`}>{row.status}</span>
                    </td>
                    <td className="py-3 text-frost/40 light:text-navy/40">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigator.clipboard.writeText(row._id);
                            alert(`Evidence ID copied to clipboard: ${row._id}\nYou can paste this in the Verify page.`);
                          }} 
                          className="text-frost/50 light:text-navy/50 hover:text-cyan transition-colors text-xs" 
                          title="Copy Evidence ID for Verification"
                        >
                          Copy ID
                        </button>
                        
                        <button onClick={(e) => handleView(e, row)} className="text-cyan hover:text-white transition-colors" title="View Evidence Inline">
                          <FiEye size={16} />
                        </button>

                        {!isForensic && (
                          <button onClick={(e) => handleDownload(e, row)} className="text-cyan hover:text-white transition-colors" title="Download Evidence">
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
