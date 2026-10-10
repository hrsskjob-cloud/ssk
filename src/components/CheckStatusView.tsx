import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Copy,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  UserCheck,
  Calendar,
  MapPin,
  Building,
  Clock,
  FileText,
  Phone,
  Mail,
  Award,
  Sparkles,
  RotateCw,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { TimelineView } from './TimelineView.tsx';
import { formatDate, getStatusBadgeClass } from '../utils/formatters.ts';
import { SupabaseStatus } from './SupabaseStatus.tsx';

interface CheckStatusViewProps {
  initialId?: string;
  onBack: () => void;
  onNavigateHome: () => void;
}

export const CheckStatusView: React.FC<CheckStatusViewProps> = ({
  initialId = '',
  onBack,
  onNavigateHome,
}) => {
  const [searchId, setSearchId] = useState(initialId.trim());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorSolution, setErrorSolution] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Loaded record
  const [loadedData, setLoadedData] = useState<{
    type: 'employer' | 'candidate';
    record: any;
  } | null>(null);

  // Stored recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sskj_recent_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Auto-search if initialId is provided
  useEffect(() => {
    if (initialId && initialId.trim()) {
      setSearchId(initialId.trim().toUpperCase());
      performLookup(initialId.trim());
    }
  }, [initialId]);

  const saveRecentId = (id: string) => {
    try {
      const upper = id.trim().toUpperCase();
      const next = [upper, ...recentSearches.filter((item) => item !== upper)].slice(0, 5);
      setRecentSearches(next);
      localStorage.setItem('sskj_recent_ids', JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const performLookup = async (idToSearch: string) => {
    const cleanId = idToSearch.trim().toUpperCase();
    if (!cleanId) {
      setErrorMessage('Please enter your unique Requirement ID (e.g. EMP001) or Application ID (e.g. JOB998).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setErrorSolution(null);

    try {
      const res = await fetch(`/api/status/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId }),
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (res.status === 404) {
          throw new Error("The API endpoint was not found on the server. This may be a deployment configuration issue. (Status: 404)");
        }
        throw new Error(`The server returned an unexpected response (Status: ${res.status}). Please check your connection.`);
      }

      if (!res.ok) {
        throw new Error(data.message || `Server returned error ${res.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Lookup failed.');
      }

      setLoadedData({
        type: data.type,
        record: data.record,
      });
      saveRecentId(cleanId);
    } catch (err: any) {
      setErrorMessage(err.message);
      setErrorSolution(getSolutionForError(err.message));
      setLoadedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(searchId);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSolutionForError = (message: string): string => {
    if (message.includes('404')) return 'Please verify the ID and try again, ensuring it starts with EMP or JOB.';
    if (message.includes('unexpected response')) return 'The server might be temporarily busy. Please wait a moment and try again.';
    return 'Please check your internet connection and try again.';
  };

  const handleClearSearch = () => {
    setLoadedData(null);
    setSearchId('');
    setErrorMessage(null);
    setErrorSolution(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={loadedData ? handleClearSearch : onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{loadedData ? 'Search Another ID' : 'Back to Home'}</span>
        </button>
        {/* <SupabaseStatus /> */}

        {loadedData && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save</span>
            </button>
            <button
              onClick={handleClearSearch}
              className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>Check Another ID</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SEARCH BAR (ALWAYS VISIBLE OR EXPANDABLE) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mb-3 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Track Application & Requirement Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Enter your unique <strong>Requirement ID</strong> (e.g., <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold">EMP001</span>) or <strong>Application ID</strong> (e.g., <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">JOB998</span>) to instantly check your recruitment timeline. No OTP or login credentials required.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 mb-6 flex items-start space-x-2.5 max-w-2xl mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Error Encountered</p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
              {errorSolution && <p className="mt-2 text-rose-800 font-semibold italic">Solution: {errorSolution}</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-5 h-5" />
              </div>
              <input
                id="status-id-input"
                type="text"
                required
                autoFocus
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                placeholder="Enter ID (e.g. EMP001 or JOB998)"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 text-base font-mono font-bold text-slate-900 tracking-wider placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 uppercase"
              />
            </div>

            <button
              id="submit-status-check-btn"
              type="submit"
              disabled={loading || !searchId.trim()}
              className="py-3.5 px-6 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>CHECK STATUS</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Recent Chips */}
          {recentSearches.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500">
              <span className="font-medium text-[11px]">Recent searches:</span>
              {recentSearches.map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => {
                    setSearchId(rec);
                    performLookup(rec);
                  }}
                  className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 px-2 py-0.5 rounded-md transition-colors"
                >
                  {rec}
                </button>
              ))}
            </div>
          )}

          {/* Identification format helper */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 flex items-start space-x-2.5">
              <Briefcase className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">Post Employer Job Requirement</p>
                <p className="text-[11px] text-amber-800/80 mt-0.5">
                  Assigned ID format starts with <strong className="font-mono">EMP</strong> (e.g. <span className="font-mono font-bold">EMP001</span>).
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 flex items-start space-x-2.5">
              <UserCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Job Seeker Career Profile</p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">
                  Assigned ID format starts with <strong className="font-mono">JOB</strong> (e.g. <span className="font-mono font-bold">JOB998</span>).
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: LOADED RECORD & TIMELINE DETAILS */}
      {/* ========================================================================= */}
      {loadedData && (
        <div className="space-y-8 animate-fadeIn">
          {/* Main Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-md">
            {/* Top Identity Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      loadedData.type === 'employer'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                  >
                    {loadedData.type === 'employer' ? 'Employer Job Requirement' : 'Job Seeker Career Profile'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Submitted on {formatDate(loadedData.record.submitted_at || loadedData.record.applied_at)}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {loadedData.type === 'employer'
                      ? loadedData.record.requirement_id
                      : loadedData.record.candidate_id}
                  </h2>
                  <button
                    onClick={() =>
                      handleCopyId(
                        loadedData.type === 'employer'
                          ? loadedData.record.requirement_id
                          : loadedData.record.candidate_id
                      )
                    }
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Copy Unique ID"
                  >
                    {copied ? (
                      <span className="text-xs font-bold text-emerald-600">Copied!</span>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {loadedData.type === 'employer'
                    ? `${loadedData.record.position_name} • ${loadedData.record.job_location}`
                    : `${loadedData.record.full_name} • ${loadedData.record.qualification}`}
                </p>
              </div>

              {/* Status Pill */}
              <div className="text-right sm:text-right">
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold border shadow-xs ${
                    getStatusBadgeClass(loadedData.record.status).bg
                  } ${getStatusBadgeClass(loadedData.record.status).text} ${
                    getStatusBadgeClass(loadedData.record.status).border
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${
                      getStatusBadgeClass(loadedData.record.status).dot
                    }`}
                  />
                  Live Status: {loadedData.record.status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Updated: {formatDate(loadedData.record.status_updated_at)}
                </p>
              </div>
            </div>

            {/* Stage-Specific Highlight Cards */}
            {loadedData.record.status === 'Interview Scheduled' && (
              <div className="mb-8 p-4 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900">
                <div className="flex items-center space-x-2 font-bold text-sm mb-2">
                  <Calendar className="w-4 h-4 text-purple-700" />
                  <span>Official Interview Details Scheduled</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/70 p-3 rounded-xl border border-purple-100">
                  <div>
                    <span className="text-slate-500 block">Date:</span>
                    <strong className="text-slate-900 font-mono">
                      {loadedData.record.interview_date || 'To be confirmed'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Time:</span>
                    <strong className="text-slate-900 font-mono">
                      {loadedData.record.interview_time || 'To be confirmed'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mode:</span>
                    <strong className="text-slate-900">
                      {loadedData.record.interview_mode || 'Online / Telephonic'}
                    </strong>
                  </div>
                </div>
                {loadedData.record.interview_remarks && (
                  <p className="text-xs text-purple-800 mt-2 font-medium">
                    Note: {loadedData.record.interview_remarks}
                  </p>
                )}
              </div>
            )}

            {(loadedData.record.status === 'Offer Letter' ||
              loadedData.record.status === 'Placement Successful' ||
              loadedData.record.status === 'Hired') && (
              <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm text-emerald-950">
                    {loadedData.record.status === 'Offer Letter'
                      ? 'Formal Offer Letter Extended'
                      : 'Recruitment Placement Accomplished!'}
                  </p>
                  <p className="text-emerald-800 mt-1">
                    {loadedData.record.status === 'Offer Letter'
                      ? `Offer released on ${loadedData.record.offer_date || 'recent date'}. Our team is coordinating candidate onboarding.`
                      : `Successfully finalized on ${loadedData.record.placement_date || loadedData.record.hired_date || 'recent date'}. Best wishes from SSK People Foundation!`}
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Timeline Progression */}
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Live Recruitment Workflow Timeline</span>
              </h3>
              <TimelineView
                type={loadedData.type}
                currentStatus={loadedData.record.status}
                history={loadedData.record.timeline}
                interviewDate={loadedData.record.interview_date}
                interviewTime={loadedData.record.interview_time}
                interviewMode={loadedData.record.interview_mode}
                offerDate={loadedData.record.offer_date}
                placementOrHiredDate={
                  loadedData.type === 'employer'
                    ? loadedData.record.placement_date
                    : loadedData.record.hired_date
                }
              />
            </div>

            {/* Comprehensive Information Details Grid */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                {loadedData.type === 'employer' ? 'Requirement Specifications' : 'Candidate Profile Summary'}
              </h3>

              {loadedData.type === 'employer' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Position Name</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.position_name}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Department</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.department}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Job Location</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.job_location}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Experience Required</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.experience_required}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Qualification</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.qualification}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Offered Salary Range</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.salary_range}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 sm:col-span-2 lg:col-span-3">
                    <span className="text-slate-400 block mb-0.5 font-medium">Key Skills</span>
                    <p className="text-slate-800 font-semibold">{loadedData.record.skills}</p>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 sm:col-span-2 lg:col-span-3">
                    <span className="text-slate-400 block mb-0.5 font-medium">Role Description</span>
                    <p className="text-slate-800 leading-relaxed">{loadedData.record.job_description}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Full Name</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.full_name}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Current Location</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.current_location}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Qualification</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.qualification}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Total Experience</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.total_experience}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Expected CTC</span>
                    <strong className="text-slate-900 text-sm font-semibold">{loadedData.record.expected_ctc}</strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block mb-0.5 font-medium">Immediate Joiner</span>
                    <strong className="text-slate-900 text-sm font-semibold">
                      {loadedData.record.immediate_joiner ? 'Yes (Immediate)' : 'Serving Notice Period'}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 sm:col-span-2 lg:col-span-3">
                    <span className="text-slate-400 block mb-0.5 font-medium">Core Skills & Expertise</span>
                    <p className="text-slate-800 font-semibold">{loadedData.record.skills}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
