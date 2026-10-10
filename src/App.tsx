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

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
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
  const [adminUsername, setAdminUsername] = useState<string>('admin');

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
  }, []);

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmployerSuccess = (data: SubmissionConfirmationData) => {
    setSubmissionData(data);
    setCurrentView('submission-success');
    fetchImpactStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCandidateSuccess = (data: SubmissionConfirmationData) => {
    setSubmissionData(data);
    setCurrentView('submission-success');
    fetchImpactStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckStatus = (id?: string) => {
    if (id) setStatusId(id);
    setCurrentView('check-status');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = (token: string, username: string) => {
    setAdminToken(token);
    setAdminUsername(username);
    setCurrentView('admin-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('sskj_admin_token');
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

        {currentView === 'admin-dashboard' && adminToken && (
          <AdminDashboard
            adminToken={adminToken}
            adminUsername={adminUsername}
            onLogout={handleAdminLogout}
            onRefreshPublicStats={fetchImpactStats}
          />
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
