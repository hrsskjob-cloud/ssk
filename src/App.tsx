import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { LandingView } from './components/LandingView.tsx';
import { EmployerForm } from './components/EmployerForm.tsx';
import { CandidateForm } from './components/CandidateForm.tsx';
import { SubmissionSuccess } from './components/SubmissionSuccess.tsx';
import { CheckStatusView } from './components/CheckStatusView.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { AppView, ImpactStats, SubmissionConfirmationData } from './types.ts';
import { supabase } from './lib/supabase.ts';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = localStorage.getItem('sskj_current_view') as AppView | null;
    const token = localStorage.getItem('sskj_admin_token');
    if (saved === 'admin-dashboard' && token) {
      return 'admin-dashboard';
    }
    return saved || 'home';
  });

  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Success screen data
  const [submissionData, setSubmissionData] = useState<SubmissionConfirmationData | null>(null);

  // Status check reference ID prefill
  const [statusId, setStatusId] = useState('');

  // Admin credentials state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('sskj_admin_token');
  });
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    return localStorage.getItem('sskj_admin_username') || 'hrsskjon@gmail.com';
  });

  // Track initial authentication verification so we don't flash login or prematurely redirect
  const [authChecking, setAuthChecking] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('sskj_admin_token'));
  });

  // Load live community impact metrics
  const fetchImpactStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/public/impact-stats');
      const data = await res.json();
      if (data.success) {
        setImpactStats(data.data);
      }
    } catch (err) {
      console.error('Failed to load community impact statistics:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchImpactStats();

    // Verify session state and restore Supabase session
    const initAuth = async () => {
      try {
        let tokenToVerify = adminToken || localStorage.getItem('sskj_admin_token');

        // Check Supabase Auth client session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          tokenToVerify = session.access_token;
          setAdminToken(session.access_token);
          localStorage.setItem('sskj_admin_token', session.access_token);
          if (session.user?.email) {
            setAdminUsername(session.user.email);
            localStorage.setItem('sskj_admin_username', session.user.email);
          }
        }

        if (tokenToVerify) {
          const res = await fetch('/api/admin/verify-session', {
            headers: { Authorization: `Bearer ${tokenToVerify}` },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.username) {
              setAdminUsername(data.username);
              localStorage.setItem('sskj_admin_username', data.username);
            }
          } else if (res.status === 401 && !session?.access_token) {
            // Only invalidate if both backend rejected and no active Supabase session
            localStorage.removeItem('sskj_admin_token');
            localStorage.removeItem('sskj_admin_username');
            setAdminToken(null);
            if (currentView === 'admin-dashboard') {
              setCurrentView('admin-login');
              localStorage.setItem('sskj_current_view', 'admin-login');
            }
          }
        }
      } catch (err) {
        console.warn('Session verification note:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    initAuth();

    // Listen for auth state changes from Supabase client (e.g. token refreshed)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.access_token) {
            setAdminToken(session.access_token);
            localStorage.setItem('sskj_admin_token', session.access_token);
            if (session.user?.email) {
              setAdminUsername(session.user.email);
              localStorage.setItem('sskj_admin_username', session.user.email);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Do not kick out if server token is active unless user explicitly logged out
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    localStorage.setItem('sskj_current_view', view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmployerSuccess = (data: SubmissionConfirmationData) => {
    setSubmissionData(data);
    setCurrentView('submission-success');
    localStorage.setItem('sskj_current_view', 'submission-success');
    fetchImpactStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCandidateSuccess = (data: SubmissionConfirmationData) => {
    setSubmissionData(data);
    setCurrentView('submission-success');
    localStorage.setItem('sskj_current_view', 'submission-success');
    fetchImpactStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckStatus = (id?: string) => {
    if (id) setStatusId(id);
    setCurrentView('check-status');
    localStorage.setItem('sskj_current_view', 'check-status');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = (token: string, username: string) => {
    setAdminToken(token);
    setAdminUsername(username);
    setAuthChecking(false);
    setCurrentView('admin-dashboard');
    localStorage.setItem('sskj_current_view', 'admin-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = async () => {
    try {
      if (adminToken) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Logout cleanup exception:', e);
    }
    localStorage.removeItem('sskj_admin_token');
    localStorage.removeItem('sskj_admin_username');
    localStorage.setItem('sskj_current_view', 'home');
    setAdminToken(null);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-slate-900 selection:bg-amber-100 selection:text-amber-900 font-sans">
      {/* Global Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        isAdminLoggedIn={Boolean(adminToken)}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {(currentView === 'home' || currentView === 'landing') && (
          <LandingView
            onNavigate={handleNavigate}
            onCheckStatus={handleCheckStatus}
            stats={impactStats}
            loadingStats={loadingStats}
          />
        )}

        {currentView === 'employer-form' && (
          <EmployerForm
            onSuccess={handleEmployerSuccess}
            onCancel={() => handleNavigate('home')}
            onCheckStatus={handleCheckStatus}
          />
        )}

        {currentView === 'candidate-form' && (
          <CandidateForm
            onSuccess={handleCandidateSuccess}
            onCancel={() => handleNavigate('home')}
            onCheckStatus={handleCheckStatus}
          />
        )}

        {currentView === 'submission-success' && submissionData && (
          <SubmissionSuccess
            data={submissionData}
            onCheckStatus={handleCheckStatus}
            onHome={() => handleNavigate('home')}
          />
        )}

        {currentView === 'check-status' && (
          <CheckStatusView
            initialId={statusId}
            onBack={() => handleNavigate('home')}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {currentView === 'admin-login' && (
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onCancel={() => handleNavigate('home')}
          />
        )}

        {currentView === 'admin-dashboard' && (
          authChecking ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-600">Verifying administrator session...</p>
            </div>
          ) : adminToken ? (
            <AdminDashboard
              adminToken={adminToken}
              adminUsername={adminUsername}
              onLogout={handleAdminLogout}
              onRefreshPublicStats={fetchImpactStats}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={handleAdminLoginSuccess}
              onCancel={() => handleNavigate('home')}
            />
          )
        )}

        {currentView === 'privacy-policy' && (
          <PrivacyPolicy onNavigate={handleNavigate} />
        )}
      </main>

      {/* Global Community Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
