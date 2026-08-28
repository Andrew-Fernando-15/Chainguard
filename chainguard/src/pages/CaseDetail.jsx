import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLoader, FiShield, FiDownload, FiEye } from 'react-icons/fi';
import { getCase, listCaseEvidence, downloadEvidence, viewEvidence, updateCaseStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

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
          <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Current In-Charge: {caseData.currentInCharge?.name || 'Unassigned'}</p>
        </div>
        
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
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Case Evidence</h3>
          {caseData.status !== 'Closed' && (
            <button onClick={() => navigate('/upload')} className="rounded-lg bg-white/10 light:bg-navy/10 px-4 py-2 text-sm text-white hover:bg-white/20 light:bg-navy/20 transition-colors">
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
    </div>
  );
}
