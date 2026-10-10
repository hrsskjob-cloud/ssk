import React from 'react';
import { CheckCircle, Search, Home, Copy, ArrowRight, ShieldCheck } from 'lucide-react';
import { SubmissionConfirmationData } from '../types.ts';
import { APP_LOGO_URL } from '../constants/branding.ts';

interface SubmissionSuccessProps {
  data: SubmissionConfirmationData;
  onCheckStatus: (id: string) => void;
  onHome: () => void;
}

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
  data,
  onCheckStatus,
  onHome,
}) => {
  const isEmployer = data.type === 'employer';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-lg text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 rounded-full border-4 border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        {/* Initiative Badge with Logo */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-5">
          <img
            src={APP_LOGO_URL}
            alt="SSK People Foundation"
            className="w-4 h-4 rounded-full object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <span>SSK People Foundation • Official Requisition</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          {isEmployer ? 'Requirement Submitted Successfully!' : 'Profile Submitted Successfully!'}
        </h1>

        {/* Message */}
        <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto mb-8 leading-relaxed">
          {isEmployer
            ? 'Your requirement has been received by SSK Job Network. Our coordination team will review the specification and start sourcing suitable SSK candidates.'
            : 'Your profile has been received by SSK Job Network. Our team will validate your profile and connect you with suitable opportunities.'}
        </p>

        {/* Prominent ID Badge */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 mb-8 max-w-md mx-auto text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            Official Reference
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {isEmployer ? 'Requirement ID' : 'Application ID'}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {data.id}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
              title="Copy ID"
            >
              {copied ? (
                <span className="text-xs font-bold text-emerald-600">Copied!</span>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {data.status}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Registered Mobile:</span>
            <span className="font-semibold text-slate-800 font-mono">+91 {data.mobile}</span>
          </div>
        </div>

        {/* Reference ID direct tracking note */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 mb-8 max-w-md mx-auto text-left flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            Please save your unique reference ID: <strong className="font-mono text-amber-950 font-black">{data.id}</strong>. You can check your progress anytime under <strong>Check Status</strong> by simply entering this ID — no OTP or password required!
          </p>
        </div>

        {/* Primary CTA: CHECK STATUS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="confirmation-check-status-btn"
            onClick={() => onCheckStatus(data.id)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-600/20 flex items-center justify-center space-x-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>CHECK STATUS NOW</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="confirmation-home-btn"
            onClick={onHome}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center justify-center space-x-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
