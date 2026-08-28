import { motion } from 'framer-motion';
import {
  FiShield, FiCpu, FiHash, FiLink, FiLock, FiUploadCloud,
  FiFileText, FiCheckCircle, FiShare2, FiBarChart2, FiSend,
} from 'react-icons/fi';
import Hero from '../components/Hero';
import FeatureCard from '../components/FeatureCard';
import ChainDivider from '../components/ChainDivider';
import ProcessTimeline from '../components/ProcessTimeline';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import { teamMembers } from '../data/dummyData';
import { useToast } from '../context/ToastContext';

const FEATURES = [
  { icon: <FiLink />, title: 'Blockchain Security', description: 'Every evidence record is committed to an immutable Ethereum ledger, impossible to alter after the fact.' },
  { icon: <FiCpu />, title: 'AI Anomaly Detection', description: 'Rule-based and ML models flag duplicate uploads, odd access hours, and suspicious logins in real time.' },
  { icon: <FiHash />, title: 'SHA-256 Hash Verification', description: 'A cryptographic fingerprint is generated for every file the moment it enters the system.' },
  { icon: <FiFileText />, title: 'Chain of Custody', description: 'A timestamped, signed trail follows evidence from the officer\'s upload to the judge\'s verdict.' },
  { icon: <FiLock />, title: 'Role Based Access', description: 'Police, investigators, forensic experts, and judges each see exactly what their role permits.' },
  { icon: <FiUploadCloud />, title: 'Digital Evidence Upload', description: 'Drag-and-drop uploads with live progress, metadata capture, and instant hashing.' },
  { icon: <FiBarChart2 />, title: 'Smart Audit Logs', description: 'Every access, edit, and transfer is logged automatically for later review.' },
  { icon: <FiCheckCircle />, title: 'Evidence Verification', description: 'Re-hash any file at any time and compare it instantly against its on-chain record.' },
  { icon: <FiShare2 />, title: 'Secure Sharing', description: 'Share evidence with authorized parties through signed, revocable access links.' },
  { icon: <FiBarChart2 />, title: 'Dashboard Analytics', description: 'Live charts track uploads, verifications, access requests, and AI alerts.' },
];

const TECH_STACK = [
  { title: 'Frontend', items: ['React.js', 'Tailwind CSS', 'Framer Motion', 'React Router', 'Chart.js'] },
  { title: 'Backend', items: ['Node.js', 'Express.js'] },
  { title: 'Blockchain', items: ['Ethereum', 'Solidity', 'Ganache', 'MetaMask'] },
  { title: 'AI', items: ['Python', 'Scikit-learn', 'Rule-based detection'] },
  { title: 'Database', items: ['MongoDB'] },
  { title: 'Hashing', items: ['SHA-256'] },
];

const SECURITY = ['AES Encryption', 'SHA-256', 'Blockchain Ledger', 'JWT Authentication', 'RBAC', 'Audit Logs', 'HTTPS Everywhere'];

export default function Landing() {
  const { pushToast } = useToast();

  const handleContact = (e) => {
    e.preventDefault();
    pushToast('Message sent — we\'ll be in touch shortly.', 'success');
    e.target.reset();
  };

  return (
    <div>
      <Hero />

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Capabilities" title="Everything a modern evidence room needs" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </section>

      <ChainDivider />

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Process" title="From evidence locker to courtroom" />
        <div className="mt-12">
          <ProcessTimeline />
        </div>
      </section>

      <ChainDivider />

      {/* Tech stack */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Under the hood" title="Technology stack" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TECH_STACK.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="font-semibold text-cyan">{t.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-frost/80 light:text-navy/80">
                {t.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-cyan/70" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      <ChainDivider />

      {/* Architecture */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="System design" title="Architecture overview" />
        <div className="glass mt-12 rounded-2xl p-8">
          <ArchitectureDiagram />
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Trust" title="Defense in depth" />
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {SECURITY.map((s) => (
            <span key={s} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm text-frost/80 light:text-navy/80">
              <FiShield className="text-green" /> {s}
            </span>
          ))}
        </div>
      </section>

      <ChainDivider />

      {/* SDG */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Impact" title="Aligned with the UN Sustainable Development Goals" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <SdgCard number="09" title="Industry, Innovation & Infrastructure" desc="Applying blockchain and AI infrastructure to modernize public-sector evidence handling." color="from-cyan/20 to-cyan/5 light:from-cyan/30 light:to-cyan/10" />
          <SdgCard number="16" title="Peace, Justice & Strong Institutions" desc="Strengthening trust in the justice system through tamper-proof, transparent evidence records." color="from-blue/20 to-blue/5 light:from-blue/30 light:to-blue/10" />
        </div>
      </section>

      <ChainDivider />

      {/* Team */}
      <section id="team" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Who built this" title="Project team" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teamMembers.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl p-6 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue/30 to-cyan/30 text-lg font-semibold text-frost light:text-navy">
                {m.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <h4 className="mt-4 font-semibold text-frost light:text-navy">{m.name}</h4>
              <p className="text-sm text-frost/70 light:text-navy/80">{m.role}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Get in touch" title="Questions about the project?" />
        <form onSubmit={handleContact} className="glass mt-10 space-y-4 rounded-2xl p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <input required placeholder="Your name" className="rounded-lg border border-white/1 light:border-navy/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-4 py-2.5 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy placeholder:text-frost/30 light:text-navy/30 light:placeholder:text-navy/40" />
            <input required type="email" placeholder="Email address" className="rounded-lg border border-white/1 light:border-navy/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-4 py-2.5 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy placeholder:text-frost/30 light:text-navy/30 light:placeholder:text-navy/40" />
          </div>
          <textarea required rows={4} placeholder="Your message" className="w-full rounded-lg border border-white/1 light:border-navy/10 light:border-navy/10 bg-white/5 light:bg-navy/5 px-4 py-2.5 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy placeholder:text-frost/30 light:text-navy/30 light:placeholder:text-navy/40" />
          <button type="submit" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue to-cyan px-6 py-2.5 text-sm font-medium text-white light:text-navy hover:opacity-90 transition-opacity">
            <FiSend /> Send Message
          </button>
        </form>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan/70">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl text-frost light:text-navy">{title}</h2>
    </div>
  );
}

function SdgCard({ number, title, desc, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass rounded-2xl bg-gradient-to-br p-8 ${color}`}
    >
      <span className="font-mono text-4xl font-bold text-frost/2 light:text-navy/20 light:text-navy/20">SDG {number}</span>
      <h4 className="mt-3 font-semibold text-frost light:text-navy">{title}</h4>
      <p className="mt-2 text-sm text-frost/80 light:text-navy/80">{desc}</p>
    </motion.div>
  );
}
