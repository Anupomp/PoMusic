import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-5">
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="w-full max-w-[400px] bg-paper brut-border shadow-brut-lg p-8"
      >
        <h1 className="font-display font-bold text-4xl uppercase tracking-tighter mb-1">
          Po<span className="bg-lime px-1">Music</span>
        </h1>
        <p className="text-smoke text-sm mb-6 font-medium">Search it. Queue it. Listen together.</p>

        <label className="block mb-4">
          <span className="brut-label text-xs block mb-1.5">Email</span>
          <input
            type="email" value={email} autoComplete="email"
            className="brut-input w-full"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        <label className="block mb-2">
          <span className="brut-label text-xs block mb-1.5">Password</span>
          <input
            type="password" value={password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="brut-input w-full"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {mode === 'register' && <p className="text-smoke text-xs mb-2">At least 8 characters.</p>}
        {error && (
          <div className="bg-coral text-paper border-2 border-ink px-3 py-2 text-sm font-medium mb-3">
            {error}
          </div>
        )}

        <button className="brut-btn w-full mt-3 mb-3" onClick={submit} disabled={busy || !email || !password}>
          {busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <button
          className="w-full text-center text-sm text-ink font-medium underline underline-offset-2 hover:text-coral"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </motion.div>
    </div>
  );
}
