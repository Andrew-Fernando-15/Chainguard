import { motion } from 'framer-motion';
import { FiAlertTriangle, FiCopy, FiClock, FiActivity } from 'react-icons/fi';
import { aiCases } from '../data/dummyData';

const HEAT = Array.from({ length: 7 * 24 }, () => Math.random());

const RISK_ICON = { 'Duplicate Upload Detected': <FiCopy />, 'Unusual Access Time (03:14 AM)': <FiClock />, 'Suspicious Login Location': <FiAlertTriangle />, 'Hash Mismatch on Re-verification': <FiActivity /> };

function riskColor(risk) {
  if (risk >= 85) return 'text-red-400 bg-red-400/10';
  if (risk >= 60) return 'text-orange-400 bg-orange-400/10';
  return 'text-cyan bg-cyan/10';
}

export default function AIDetection() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Machine Learning</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">AI Anomaly Detection</h1>
      <p className="mt-1 text-sm text-frost/50">Rule-based checks and a lightweight classifier scan every action in real time.</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {aiCases.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-cyan/70">{c.id}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskColor(c.risk)}`}>Risk {c.risk}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-frost/70">
              <span className="text-lg text-cyan">{RISK_ICON[c.issue]}</span>
              {c.issue}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className={`h-full rounded-full ${c.risk >= 85 ? 'bg-red-400' : c.risk >= 60 ? 'bg-orange-400' : 'bg-cyan'}`} style={{ width: `${c.risk}%` }} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold">Access Heat Map</h3>
          <p className="mt-1 text-xs text-frost/40">Login & access density across the week, by hour</p>
          <div className="mt-4 grid grid-cols-24 gap-[3px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0,1fr))' }}>
            {HEAT.map((v, i) => (
              <div
                key={i}
                title={`Hour ${i % 24}:00`}
                className="aspect-square rounded-sm"
                style={{ backgroundColor: `rgba(6,182,212,${0.08 + v * 0.55})` }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-frost/30">
            <span>Mon 00:00</span><span>Sun 23:00</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold">Prediction Result</h3>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Model" value="RandomForest + rules" />
            <Row label="Latest scan" value="EVD-10188" />
            <Row label="Verdict" value="Anomalous" tone="text-red-400" />
            <Row label="Confidence" value="94.2%" tone="text-cyan" />
          </div>
          <p className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-frost/50">
            A hash mismatch was found on re-verification — the file's on-chain fingerprint no longer
            matches the stored copy. Flagged for forensic review.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone = 'text-frost/80' }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-frost/40">{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}
