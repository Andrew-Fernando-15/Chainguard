import { motion } from 'framer-motion';
import {
  FiUploadCloud,
  FiHash,
  FiDatabase,
  FiCpu,
  FiLock,
  FiCheckCircle,
  FiAward,
} from 'react-icons/fi';

const STEPS = [
  { icon: <FiUploadCloud />, title: 'Evidence Upload', desc: 'Officers or forensic experts upload digital files through a secure dashboard.' },
  { icon: <FiHash />, title: 'SHA-256 Hash Generation', desc: 'Every file is fingerprinted client-side, so the original never leaves the browser unhashed.' },
  { icon: <FiDatabase />, title: 'Blockchain Storage', desc: 'The hash and metadata are committed to an Ethereum smart contract via Ganache.' },
  { icon: <FiCpu />, title: 'AI Analysis', desc: 'A rule-based and ML model scans for duplicate uploads, odd access times, and anomalies.' },
  { icon: <FiLock />, title: 'Secure Access', desc: 'Role-based access control governs who can view, annotate, or approve each item.' },
  { icon: <FiCheckCircle />, title: 'Verification', desc: 'Any party can re-hash the file and compare it against the on-chain record instantly.' },
  { icon: <FiAward />, title: 'Court Ready Evidence', desc: 'A verifiable, timestamped chain of custody is presented to the judge.' },
];

export default function ProcessTimeline() {
  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-blue via-cyan to-green" />
      <div className="flex flex-col gap-8">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="relative flex gap-5 pl-1"
          >
            <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy text-cyan glow-border">
              {s.icon}
            </div>
            <div className="glass flex-1 rounded-xl p-4">
              <p className="text-xs font-mono text-cyan/70">STEP {String(i + 1).padStart(2, '0')}</p>
              <h4 className="mt-1 font-semibold">{s.title}</h4>
              <p className="mt-1 text-sm text-frost/55 light:text-navy/55">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
