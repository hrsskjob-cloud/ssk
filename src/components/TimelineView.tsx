import React from 'react';
import { CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react';
import { StatusHistoryEntry } from '../types.ts';
import { formatDateTime } from '../utils/formatters.ts';

interface TimelineViewProps {
  type: 'employer' | 'candidate';
  currentStatus: string;
  history?: StatusHistoryEntry[];
  interviewDate?: string | null;
  interviewTime?: string | null;
  interviewMode?: string | null;
  offerDate?: string | null;
  placementOrHiredDate?: string | null;
}

const EMPLOYER_STEPS = [
  'Submitted',
  'Sourcing',
  'Interview Scheduled',
  'Offer Letter',
  'Placement Successful',
];

const CANDIDATE_STEPS = [
  'Applied',
  'Validation',
  'Interview Scheduled',
  'Offer Letter',
  'Hired',
];

export const TimelineView: React.FC<TimelineViewProps> = ({
  type,
  currentStatus,
  history = [],
  interviewDate,
  interviewTime,
  interviewMode,
  offerDate,
  placementOrHiredDate,
}) => {
  const steps = type === 'employer' ? EMPLOYER_STEPS : CANDIDATE_STEPS;
  const isRejected = currentStatus === 'Rejected';

  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div className="space-y-6">
      {/* Mobile-friendly Linear Step Flow */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Recruitment Progression
        </h4>
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden sm:block absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2">
            {steps.map((step, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx && !isRejected;
              const isUpcoming = currentIndex < idx && !isRejected;

              return (
                <div
                  key={step}
                  className={`flex sm:flex-col items-center sm:text-center p-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-white shadow-sm border border-amber-300 sm:border-transparent'
                      : ''
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-3 sm:mr-0 sm:mb-1.5 z-10 ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-600 text-white ring-4 ring-amber-100'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium leading-snug ${
                        isCurrent
                          ? 'text-slate-900 font-semibold'
                          : isPast
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {step}
                    </p>
                    {isCurrent && (
                      <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isRejected && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center text-rose-800 text-xs font-medium">
              <XCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
              <span>This profile was marked as <strong>Rejected</strong> by the coordination team.</span>
            </div>
          )}
        </div>
      </div>

      {/* Specific Stage Milestones */}
      {(interviewDate || offerDate || placementOrHiredDate) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {interviewDate && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs">
              <p className="font-semibold text-amber-900 mb-1 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Interview Details
              </p>
              <p className="text-slate-700">Date: <span className="font-medium">{interviewDate}</span></p>
              {interviewTime && <p className="text-slate-700">Time: <span className="font-medium">{interviewTime}</span></p>}
              {interviewMode && <p className="text-slate-700">Mode: <span className="font-medium">{interviewMode}</span></p>}
            </div>
          )}

          {offerDate && (
            <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-xs">
              <p className="font-semibold text-indigo-900 mb-1 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Offer Letter Issued
              </p>
              <p className="text-slate-700">Date: <span className="font-medium">{offerDate}</span></p>
            </div>
          )}

          {placementOrHiredDate && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs">
              <p className="font-semibold text-emerald-900 mb-1 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                {type === 'employer' ? 'Placement Finalized' : 'Confirmed Hired'}
              </p>
              <p className="text-slate-700">Date: <span className="font-medium">{placementOrHiredDate}</span></p>
            </div>
          )}
        </div>
      )}

      {/* Activity Timeline Log */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Status Activity Log
        </h4>
        {history && history.length > 0 ? (
          <div className="border-l-2 border-slate-200 ml-3 pl-4 space-y-4">
            {history.map((h, i) => (
              <div key={i} className="relative group">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-400 group-last:bg-amber-600 ring-4 ring-white" />
                <div className="text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900">{h.new_status}</span>
                    {h.previous_status && (
                      <span className="text-slate-400 text-[11px] flex items-center">
                        (from {h.previous_status})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {formatDateTime(h.changed_at)}
                    {h.changed_by && ` • ${h.changed_by}`}
                  </p>
                  {h.remarks && (
                    <p className="mt-1 text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                      {h.remarks}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No previous transition history recorded yet.</p>
        )}
      </div>
    </div>
  );
};
