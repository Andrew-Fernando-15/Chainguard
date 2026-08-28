import { motion } from 'framer-motion';
import { FiCheck, FiUserCheck } from 'react-icons/fi';
import { roles } from '../data/dummyData';

export default function Roles() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">Access Control</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">User Roles & Permissions</h1>
      <p className="mt-1 text-sm text-frost/50 light:text-navy/50">Every account is scoped to exactly what its role needs — nothing more.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue/20 to-cyan/20 text-cyan">
                <FiUserCheck />
              </span>
              <h3 className="font-semibold">{r.name}</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-frost/60 light:text-navy/60">
              {r.permissions.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <FiCheck className="mt-0.5 flex-shrink-0 text-green" /> {p}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
