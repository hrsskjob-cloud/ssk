import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowLeft, AlertCircle } from 'lucide-react';
import { APP_LOGO_URL } from '../constants/branding.ts';
import { supabase } from '../lib/supabase.ts';

interface AdminLoginProps {
  onLoginSuccess: (token: string, username: string) => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onCancel,
}) => {
  const [username, setUsername] = useState('hrsskjon@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanUsername = username.trim();
    const cleanEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@gmail.com`;

    try {
      // 1. Authenticate with Supabase Auth for persistent client session & auto token refresh
      let supabaseToken: string | null = null;
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!authErr && authData.session?.access_token) {
          supabaseToken = authData.session.access_token;
        }
      } catch (clientAuthErr) {
        console.warn('Supabase Auth signIn note:', clientAuthErr);
      }

      // 2. Authenticate with backend API
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error(`Server returned an invalid response (status ${res.status}).`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid administrative credentials.');
      }

      const activeToken = supabaseToken || data.token;
      const activeUsername = data.username || cleanUsername;

      localStorage.setItem('sskj_admin_token', activeToken);
      localStorage.setItem('sskj_admin_username', activeUsername);
      localStorage.setItem('sskj_current_view', 'admin-dashboard');

      onLoginSuccess(activeToken, activeUsername);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <button
        onClick={onCancel}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Platform</span>
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs p-1 flex items-center justify-center mb-4 mx-auto overflow-hidden">
          <img
            src={APP_LOGO_URL}
            alt="SSK Job Network Logo"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="text-center mb-6">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            Authorized Personnel Only
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2">
            SSK Job Network Admin Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            SSK People Foundation Coordination Desk
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username-input" className="block text-xs font-bold text-slate-700 mb-1">
              Admin Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                id="admin-username-input"
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password-input" className="block text-xs font-bold text-slate-700 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                id="admin-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Secure Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
