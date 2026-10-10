import React, { useState } from 'react';
import { Briefcase, UserCheck, ShieldCheck, Menu, X, Users, Home, Search } from 'lucide-react';
import { AppView } from '../types.ts';
import { APP_LOGO_URL } from '../constants/branding.ts';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  isAdminLoggedIn,
  onAdminLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-x-4 lg:gap-x-8">
          {/* Logo Brand */}
          <button
            id="nav-logo-btn"
            onClick={() => handleNav('home')}
            className="flex items-center text-left focus:outline-none group py-1 shrink-0"
            title="SSK Job Network"
          >
            <img
              src={APP_LOGO_URL}
              alt="SSK Job Network"
              className="h-14 sm:h-16 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              id="nav-home-btn"
              onClick={() => handleNav('home')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5 ${
                currentView === 'home' || currentView === 'landing'
                  ? 'text-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              id="nav-employer-btn"
              onClick={() => handleNav('employer-form')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5 ${
                currentView === 'employer-form'
                  ? 'text-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>For Employers</span>
            </button>

            <button
              id="nav-candidate-btn"
              onClick={() => handleNav('candidate-form')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5 ${
                currentView === 'candidate-form'
                  ? 'text-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>For Job Seekers</span>
            </button>

            <button
              id="nav-check-status-btn"
              onClick={() => handleNav('check-status')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all ${
                currentView === 'check-status'
                  ? 'border-amber-600 text-amber-700 bg-amber-50 shadow-sm'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              Check My Status
            </button>

            {isAdminLoggedIn ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <button
                  id="nav-admin-dashboard-btn"
                  onClick={() => handleNav('admin-dashboard')}
                  className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Admin Panel
                </button>
                <button
                  id="nav-admin-logout-btn"
                  onClick={onAdminLogout}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                id="nav-admin-login-btn"
                onClick={() => handleNav('admin-login')}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
                title="Admin Login"
              >
                <ShieldCheck className="w-4 h-4 inline-block" />
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-2">
            <button
              id="mobile-check-status-header-btn"
              onClick={() => handleNav('check-status')}
              className="text-xs font-semibold px-2.5 py-1.5 border border-amber-500/40 text-amber-800 bg-amber-50 rounded-lg"
            >
              Status
            </button>

            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          <button
            id="m-nav-home-btn"
            onClick={() => handleNav('home')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 ${
              currentView === 'home' || currentView === 'landing' ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Home className="w-4 h-4 text-amber-600" />
            <span>Home</span>
          </button>

          <button
            id="m-nav-employer-btn"
            onClick={() => handleNav('employer-form')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 ${
              currentView === 'employer-form' ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4 text-amber-600" />
            <span>I Am An Employer</span>
          </button>

          <button
            id="m-nav-candidate-btn"
            onClick={() => handleNav('candidate-form')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 ${
              currentView === 'candidate-form' ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>I Am Looking For A Job</span>
          </button>

          <button
            id="m-nav-check-status-btn"
            onClick={() => handleNav('check-status')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 ${
              currentView === 'check-status' ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Search className="w-4 h-4 text-amber-600" />
            <span>Check My Status</span>
          </button>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            {isAdminLoggedIn ? (
              <div className="w-full flex items-center justify-between">
                <button
                  id="m-nav-admin-dashboard-btn"
                  onClick={() => handleNav('admin-dashboard')}
                  className="text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                  Admin Dashboard
                </button>
                <button
                  id="m-nav-admin-logout-btn"
                  onClick={() => {
                    onAdminLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-medium text-rose-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                id="m-nav-admin-login-btn"
                onClick={() => handleNav('admin-login')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
