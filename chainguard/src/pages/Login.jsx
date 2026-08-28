import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShield, FiMail, FiLock, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loginUser, registerUser } from '../services/api';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', position: 'Police', role: 'Investigating Officer' });
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await registerUser(form);
        pushToast('Account created — logging you in...', 'success');
      }
      const data = await loginUser({ 
        name: form.name, 
        position: form.position, 
        role: form.role, 
        email: form.email, 
        password: form.password 
      });
      login(data.user, data.token);
      pushToast(`Welcome, ${data.user.name}`, 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Is the backend running?';
      pushToast(msg, 'warning');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue to-cyan">
            <FiShield className="text-navy" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">
              {mode === 'login' ? 'Sign in to ChainGuard' : 'Create an account'}
            </h1>
            <p className="text-xs text-frost/50 light:text-navy/50">
              {mode === 'login' ? 'Access the evidence dashboard' : 'Register as an investigator'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="off">
          <div className="relative">
            <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frost/40 light:text-navy/40" />
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              required
              autoComplete="off"
              data-lpignore="true"
              className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-frost/30 light:text-navy/30 focus:border-cyan/50"
            />
          </div>

          <div className="flex gap-2">
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              className="w-1/2 rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 py-2.5 px-3 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
            >
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Police">Police</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Forensic">Forensic</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Judge">Judge</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="CBI">CBI</option>
            </select>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-1/2 rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 py-2.5 px-3 text-sm outline-none focus:border-cyan/50 text-frost light:text-navy"
            >
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Investigating Officer">Investigating Officer</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Normal Officer">Normal Officer</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="Judge">Judge</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="CBI">CBI</option>
              <option className="bg-slate-900 text-white light:bg-white light:text-navy" value="N/A">N/A</option>
            </select>
          </div>

          <div className="relative">
            <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frost/40 light:text-navy/40" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              required
              autoComplete="off"
              data-lpignore="true"
              className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-frost/30 light:text-navy/30 focus:border-cyan/50"
            />
          </div>

          <div className="relative">
            <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frost/40 light:text-navy/40" />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              required
              minLength={6}
              autoComplete="new-password"
              data-lpignore="true"
              className="w-full rounded-lg border border-white/10 light:border-navy/10 bg-white/5 light:bg-navy/5 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-frost/30 light:text-navy/30 focus:border-cyan/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-blue to-cyan py-2.5 text-sm font-medium text-navy transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-frost/50 light:text-navy/50">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-cyan hover:underline"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}