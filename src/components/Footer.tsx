import React from 'react';
import { ShieldCheck, Heart, Users } from 'lucide-react';
import { AppView } from '../types.ts';
import { APP_LOGO_URL } from '../constants/branding.ts';

interface FooterProps {
  onNavigate: (view: AppView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Core Community Banner */}
        <div className="bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20 border border-amber-500/30 rounded-2xl p-6 mb-10 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-amber-400 mb-2">
            The Community Mission
          </p>
          <h3 className="text-base sm:text-xl font-bold text-white tracking-wide leading-relaxed">
            REGISTER YOUR OPPORTUNITY. REGISTER YOUR SKILLS. <br className="hidden sm:inline" />
            LET THE COMMUNITY CONNECT BOTH.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2.5 text-white font-black text-xl mb-2">
              <div className="w-9 h-9 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                <img
                  src={APP_LOGO_URL}
                  alt="SSK JOB Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span>SSK Job Network</span>
            </div>
            <p className="text-xs text-amber-400 font-semibold mb-2">
              An initiative of SSK People Foundation
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dedicated to community empowerment, transparent staffing coordination, and sustainable economic growth for SSK families and enterprises.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Platform Actions
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('employer-form')}
                  className="hover:text-amber-400 transition-colors"
                >
                  Post a Job Requirement (Employers)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('candidate-form')}
                  className="hover:text-amber-400 transition-colors"
                >
                  Register Career Profile (Job Seekers)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('check-status')}
                  className="hover:text-amber-400 transition-colors"
                >
                  Check Application Status (By Unique ID)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('privacy-policy')}
                  className="hover:text-amber-400 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
              Trust & Transparency
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Zero recruitment fees charged to candidates. All applications are validated by the SSK coordination cell.
            </p>
            <div className="mb-4">
              <p className="text-xs font-semibold text-amber-500 mb-1">Helpline / Support</p>
              <a href="tel:+918884449689" className="text-sm font-bold text-white hover:text-amber-400 transition-colors">
                +91 888 444 9689
              </a>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <button
                id="footer-admin-login-btn"
                onClick={() => onNavigate('admin-login')}
                className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center space-x-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authorized Administrative Portal</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} SSK Job Network • SSK People Foundation. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 flex items-center">
            Built for community empowerment <Heart className="w-3 h-3 text-amber-500 mx-1 inline" /> Version 1.0
          </p>
        </div>
      </div>
    </footer>
  );
};
