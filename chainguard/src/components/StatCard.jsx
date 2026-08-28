import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

const ACCENTS = {
  blue: 'from-blue/20 to-blue/5 text-blue',
  cyan: 'from-cyan/20 to-cyan/5 text-cyan',
  green: 'from-green/20 to-green/5 text-green',
};

export default function StatCard({ label, value, delta, accent = 'blue' }) {
  const positive = delta?.startsWith('+');
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass rounded-2xl bg-gradient-to-br p-5 ${ACCENTS[accent]}`}
    >
      <p className="text-xs uppercase tracking-wider text-frost/50 light:text-navy/50">{label}</p>
      <p className="mt-2 text-3xl font-bold text-frost light:text-navy">
        <AnimatedCounter value={value} />
      </p>
      <p className={`mt-1 text-xs ${positive ? 'text-green' : 'text-cyan'}`}>{delta} this month</p>
    </motion.div>
  );
}
