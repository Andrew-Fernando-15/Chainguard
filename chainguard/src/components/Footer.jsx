import { FiShield, FiGithub, FiFileText, FiLock } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 light:border-navy/5 bg-slate/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue to-cyan">
              <FiShield className="text-navy" />
            </span>
            ChainGuard
          </div>
          <p className="mt-3 text-sm text-frost/50 light:text-navy/50">
            AI-assisted, blockchain-secured digital evidence management — built for police,
            forensics, and the courts.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-frost/80 light:text-navy/80">Quick Links</h4>
          <ul className="mt-3 space-y-2 text-sm text-frost/50 light:text-navy/50">
            <li><a href="/#features" className="hover:text-cyan">Features</a></li>
            <li><a href="/#how-it-works" className="hover:text-cyan">How It Works</a></li>
            <li><a href="/dashboard" className="hover:text-cyan">Dashboard</a></li>
            <li><a href="/#team" className="hover:text-cyan">Team</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-frost/80 light:text-navy/80">Resources</h4>
          <ul className="mt-3 space-y-2 text-sm text-frost/50 light:text-navy/50">
            <li><a href="https://github.com" className="flex items-center gap-2 hover:text-cyan"><FiGithub /> GitHub</a></li>
            <li><a href="#" className="flex items-center gap-2 hover:text-cyan"><FiFileText /> Documentation</a></li>
            <li><a href="#" className="flex items-center gap-2 hover:text-cyan"><FiLock /> Privacy Policy</a></li>
            <li><a href="#" className="hover:text-cyan">License</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-frost/80 light:text-navy/80">SDG Alignment</h4>
          <p className="mt-3 text-sm text-frost/50 light:text-navy/50">
            Supporting SDG 9 (Industry, Innovation & Infrastructure) and SDG 16
            (Peace, Justice & Strong Institutions).
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 light:border-navy/5 py-6 text-center text-xs text-frost/30 light:text-navy/30">
        © {new Date().getFullYear()} ChainGuard — Final Year Engineering Project. Built with React, Node.js & Ethereum.
      </div>
    </footer>
  );
}
