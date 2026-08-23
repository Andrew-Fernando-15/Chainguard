import { motion } from 'framer-motion';
import { FiUser, FiHash, FiLink } from 'react-icons/fi';
import { custodyTimeline } from '../data/dummyData';

export default function ChainOfCustody() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">EVD-10231</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Chain of Custody</h1>
      <p className="mt-1 text-sm text-frost/50">Every handoff is timestamped, signed, and anchored to the blockchain.</p>

      <div className="relative mt-10">
        <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-blue via-cyan to-green" />
        <div className="flex flex-col gap-6">
          {custodyTimeline.map((event, i) => (
            <motion.div
              key={event.role}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.06 }}
              className="relative flex gap-5"
            >
              <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy text-cyan glow-border">
                <FiUser />
              </div>
              <div className="glass flex-1 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold">{event.role}</h4>
                  <span className="text-xs text-frost/40">{event.time}</span>
                </div>
                <p className="mt-1 text-sm text-frost/60">{event.person}</p>
                <div className="mt-3 grid gap-2 text-xs text-frost/50 sm:grid-cols-2">
                  <span className="flex items-center gap-1.5"><FiLink className="text-cyan" /> Tx: <span className="font-mono text-cyan/80">{event.tx}</span></span>
                  <span className="flex items-center gap-1.5"><FiHash className="text-cyan" /> Sig: <span className="font-mono text-cyan/80">{event.signature}</span></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
