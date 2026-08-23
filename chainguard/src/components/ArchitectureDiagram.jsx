import { motion } from 'framer-motion';

const NODES = [
  { id: 'police', label: 'Police', sub: 'Evidence source', x: 340, y: 20 },
  { id: 'frontend', label: 'Frontend', sub: 'React · Tailwind', x: 340, y: 110 },
  { id: 'backend', label: 'Backend API', sub: 'Node.js · Express', x: 340, y: 200 },
  { id: 'mongo', label: 'MongoDB', sub: 'Metadata store', x: 150, y: 290 },
  { id: 'chain', label: 'Blockchain', sub: 'Ethereum · Ganache', x: 340, y: 290 },
  { id: 'ai', label: 'AI Detection Engine', sub: 'Python · Scikit-learn', x: 530, y: 290 },
  { id: 'judge', label: 'Judge Dashboard', sub: 'Verified view', x: 340, y: 380 },
];

const EDGES = [
  ['police', 'frontend'],
  ['frontend', 'backend'],
  ['backend', 'mongo'],
  ['backend', 'chain'],
  ['backend', 'ai'],
  ['mongo', 'judge'],
  ['chain', 'judge'],
  ['ai', 'judge'],
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

export default function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 680 440" className="mx-auto w-full max-w-2xl" role="img" aria-label="System architecture diagram">
      <defs>
        <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {EDGES.map(([from, to], i) => {
        const a = byId[from];
        const b = byId[to];
        return (
          <motion.line
            key={i}
            x1={a.x} y1={a.y + 22}
            x2={b.x} y2={b.y}
            stroke="url(#edgeGrad)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
          />
        );
      })}

      {NODES.map((n, i) => (
        <motion.g
          key={n.id}
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        >
          <rect
            x={n.x - 80}
            y={n.y}
            width="160"
            height="44"
            rx="12"
            fill="#1E293B"
            stroke="#06B6D4"
            strokeOpacity="0.4"
          />
          <text x={n.x} y={n.y + 18} textAnchor="middle" fill="#F8FAFC" fontSize="13" fontWeight="600">
            {n.label}
          </text>
          <text x={n.x} y={n.y + 33} textAnchor="middle" fill="#94A3B8" fontSize="9">
            {n.sub}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
