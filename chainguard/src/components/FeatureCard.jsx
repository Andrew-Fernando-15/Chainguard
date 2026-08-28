import { motion } from 'framer-motion';

export default function FeatureCard({ icon, title, description, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      whileHover={{ y: -6 }}
      className="group glass relative overflow-hidden rounded-2xl p-6 transition-shadow hover:glow-border"
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan/10 blur-2xl transition-all group-hover:bg-cyan/20" />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue/20 to-cyan/20 text-xl text-cyan">
        {icon}
      </div>
      <h3 className="relative mt-4 font-semibold">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-frost/80 light:text-navy/80">{description}</p>
    </motion.div>
  );
}
