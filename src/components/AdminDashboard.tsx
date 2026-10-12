import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Briefcase,
  UserCheck,
  CalendarCheck,
  FileCheck2,
  Award,
  TrendingUp,
  Download,
  Filter,
  Search,
  RefreshCw,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Calendar,
  Lock,
  ChevronRight,
  ChevronDown,
  Building,
  Database,
  Cloud,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  EmployerRequirementRecord,
  EmployeeCandidateRecord,
  EmployerStatus,
  CandidateStatus,
} from '../types.ts';
import { formatINR, formatDate, formatDateTime, getStatusBadgeClass } from '../utils/formatters.ts';
import { APP_LOGO_URL } from '../constants/branding.ts';
import { supabase } from '../lib/supabase.ts';

interface AdminDashboardProps {
  adminToken: string;
  adminUsername: string;
  onLogout: () => void;
  onRefreshPublicStats: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminToken,
  adminUsername,
  onLogout,
  onRefreshPublicStats,
}) => {
  // Navigation Tabs: 'overview' | 'employers' | 'candidates'
  const [activeTab, setActiveTab] = useState<'overview' | 'employers' | 'candidates'>('overview');

  // KPIs
  const [kpis, setKpis] = useState<{
    totalRequirements: number;
    totalJobSeekers: number;
    totalInterviews: number;
    totalOffers: number;
    totalPlacements: number;
    totalAnnualPackage: number;
    averageDaysToPlacement: number;
    sourcingCount: number;
  } | null>(null);

  // Data lists
  const [employers, setEmployers] = useState<EmployerRequirementRecord[]>([]);
  const [candidates, setCandidates] = useState<EmployeeCandidateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters for Employer Requirements
  const [empSearch, setEmpSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');
  const [empLocationFilter, setEmpLocationFilter] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('');

  // Filters for Job Seekers
  const [candSearch, setCandSearch] = useState('');
  const [candStatusFilter, setCandStatusFilter] = useState('');
  const [candLocationFilter, setCandLocationFilter] = useState('');
  const [candExpFilter, setCandExpFilter] = useState('');
  const [candImmediateFilter, setCandImmediateFilter] = useState('');

  // Status configuration lists for quick filtering
  const employerStatusList = [
    { label: 'All Statuses', value: '', dotClass: 'bg-slate-400' },
    { label: 'Submitted', value: 'Submitted', dotClass: 'bg-amber-500' },
    { label: 'Sourcing', value: 'Sourcing', dotClass: 'bg-purple-500' },
    { label: 'Interview Scheduled', value: 'Interview Scheduled', dotClass: 'bg-blue-500' },
    { label: 'Offer Letter', value: 'Offer Letter', dotClass: 'bg-indigo-500' },
    { label: 'Placement Successful', value: 'Placement Successful', dotClass: 'bg-emerald-500' },
    { label: 'Rejected', value: 'Rejected', dotClass: 'bg-rose-500' },
  ];

  const candidateStatusList = [
    { label: 'All Statuses', value: '', dotClass: 'bg-slate-400' },
    { label: 'Applied', value: 'Applied', dotClass: 'bg-sky-500' },
    { label: 'Validation', value: 'Validation', dotClass: 'bg-violet-500' },
    { label: 'Interview Scheduled', value: 'Interview Scheduled', dotClass: 'bg-blue-500' },
    { label: 'Offer Letter', value: 'Offer Letter', dotClass: 'bg-indigo-500' },
    { label: 'Hired', value: 'Hired', dotClass: 'bg-emerald-500' },
    { label: 'Rejected', value: 'Rejected', dotClass: 'bg-rose-500' },
  ];

  // Live status-wise count state
  const [employerStatusCounts, setEmployerStatusCounts] = useState<Record<string, number>>({});
  const [candidateStatusCounts, setCandidateStatusCounts] = useState<Record<string, number>>({});

  const fetchEmployerStatusCounts = async () => {
    try {
      const response = await authFetch('/api/admin/employer-requirements-counts');
      const data = await response.json();
      if (data.success) {
        setEmployerStatusCounts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch employer counts', err);
    }
  };

  const fetchCandidateStatusCounts = async () => {
    try {
      const response = await authFetch('/api/admin/employee-candidates-counts');
      const data = await response.json();
      if (data.success) {
        setCandidateStatusCounts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch candidate counts', err);
    }
  };

  // Detail / Status Modal State
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerRequirementRecord | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<EmployeeCandidateRecord | null>(null);

  // Status update form inside modal
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [statusRemarks, setStatusRemarks] = useState<string>('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewMode, setInterviewMode] = useState('In-Person');
  const [interviewRemarks, setInterviewRemarks] = useState('');
  const [offerDate, setOfferDate] = useState('');
  const [placementOrHiredDate, setPlacementOrHiredDate] = useState('');
  const [annualPackage, setAnnualPackage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Supabase Cloud Database Status
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    projectUrl: string;
    host: string;
    database: string;
    latencyMs: number;
    tables: string[];
    counts: { employers: number; candidates: number; history: number };
    lastSyncedAt: string;
  } | null>(null);
  const [syncingSupabase, setSyncingSupabase] = useState(false);

  useEffect(() => {
    fetchKpis();
    fetchEmployers();
    fetchCandidates();
    fetchEmployerStatusCounts();
    fetchCandidateStatusCounts();
    fetchSupabaseStatus();

    // Subscribe to Realtime changes
    const employerChannel = supabase
      .channel('employer-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employer_requirements' },
        (payload) => {
          console.log('Employer change detected:', payload);
          fetchEmployerStatusCounts();
          fetchEmployers();    // Refetch filtered for current view
          fetchKpis();
        }
      )
      .subscribe();

    const candidateChannel = supabase
      .channel('candidate-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_candidates' },
        (payload) => {
          console.log('Candidate change detected:', payload);
          fetchCandidateStatusCounts();
          fetchCandidates();    // Refetch filtered for current view
          fetchKpis();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(employerChannel);
      supabase.removeChannel(candidateChannel);
    };
  }, [adminToken]);

  // Authenticated fetch wrapper that attaches token, handles token refresh and prevents spurious logouts
  const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    let currentToken = adminToken || localStorage.getItem('sskj_admin_token') || '';
    const headers = new Headers(init.headers || {});
    if (!headers.has('Authorization') && currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    let response = await fetch(input, { ...init, headers });

    if (response.status === 401) {
      // 1. Attempt token refresh from Supabase Auth
      try {
        const { data } = await supabase.auth.refreshSession();
        if (data?.session?.access_token) {
          currentToken = data.session.access_token;
          headers.set('Authorization', `Bearer ${currentToken}`);
          localStorage.setItem('sskj_admin_token', currentToken);
          // Retry request with fresh token
          response = await fetch(input, { ...init, headers });
        }
      } catch (refreshErr) {
        console.warn('Session refresh warning:', refreshErr);
      }

      // 2. Only if still 401, verify if session is definitively invalid
      if (response.status === 401) {
        try {
          const verifyRes = await fetch('/api/admin/verify-session', {
            headers: { Authorization: `Bearer ${currentToken}` },
          });
          if (verifyRes.status === 401) {
            onLogout();
          }
        } catch {
          // Network hiccup - preserve session
        }
      }
    }

    return response;
  };

  const fetchSupabaseStatus = async () => {
    try {
      const res = await authFetch('/api/supabase/status');
      const data = await res.json();
      if (data.success) {
        setSupabaseStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch Supabase status:', err);
    }
  };

  const handleSyncSupabase = async () => {
    setSyncingSupabase(true);
    setErrorMessage(null);
    try {
      const res = await authFetch('/api/supabase/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage('Database synchronized with Supabase PostgreSQL cloud successfully!');
        setSupabaseStatus(data.data);
        fetchKpis();
        fetchEmployers('');
        fetchCandidates('');
        onRefreshPublicStats();
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Supabase sync failed');
    } finally {
      setSyncingSupabase(false);
    }
  };

  const fetchKpis = async () => {
    try {
      const res = await authFetch('/api/admin/kpis');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKpis(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };


  const fetchEmployers = async (
    statusOverride?: string,
    searchOverride?: string,
    locOverride?: string,
    deptOverride?: string
  ) => {
    setLoading(true);
    try {
      const sStatus = statusOverride !== undefined ? statusOverride : empStatusFilter;
      const sSearch = searchOverride !== undefined ? searchOverride : empSearch;
      const sLoc = locOverride !== undefined ? locOverride : empLocationFilter;
      const sDept = deptOverride !== undefined ? deptOverride : empDeptFilter;

      const params = new URLSearchParams();
      if (sSearch) params.set('search', sSearch);
      if (sStatus) params.set('status', sStatus);
      if (sLoc) params.set('location', sLoc);
      if (sDept) params.set('department', sDept);

      const res = await authFetch(`/api/admin/employer-requirements?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmployers(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching employers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (
    statusOverride?: string,
    searchOverride?: string,
    locOverride?: string,
    expOverride?: string,
    immOverride?: string
  ) => {
    setLoading(true);
    try {
      const sStatus = statusOverride !== undefined ? statusOverride : candStatusFilter;
      const sSearch = searchOverride !== undefined ? searchOverride : candSearch;
      const sLoc = locOverride !== undefined ? locOverride : candLocationFilter;
      const sExp = expOverride !== undefined ? expOverride : candExpFilter;
      const sImm = immOverride !== undefined ? immOverride : candImmediateFilter;

      const params = new URLSearchParams();
      if (sSearch) params.set('search', sSearch);
      if (sStatus) params.set('status', sStatus);
      if (sLoc) params.set('location', sLoc);
      if (sExp) params.set('experience', sExp);
      if (sImm) params.set('immediate_joiner', sImm);

      const res = await authFetch(`/api/admin/job-seekers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCandidates(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpStatusSelect = (status: string) => {
    setEmpStatusFilter(status);
    fetchEmployers(status);
  };

  const handleCandStatusSelect = (status: string) => {
    setCandStatusFilter(status);
    fetchCandidates(status);
  };

  const handleNavigateToEmployerStatus = (status: string) => {
    setActiveTab('employers');
    setEmpStatusFilter(status);
    fetchEmployers(status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToCandidateStatus = (status: string) => {
    setActiveTab('candidates');
    setCandStatusFilter(status);
    fetchCandidates(status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Employer Detail Modal
  const openEmployerModal = async (emp: EmployerRequirementRecord) => {
    try {
      const res = await authFetch(`/api/admin/employer-requirements/${emp.requirement_id}`);
      const data = await res.json();
      const record = data.success ? data.data : emp;
      setSelectedEmployer(record);
      setSelectedCandidate(null);
      setNewStatus(record.status);
      setAdminNotes(record.admin_notes || '');
      setStatusRemarks('');
      setInterviewDate(record.interview_date || '');
      setInterviewTime(record.interview_time || '');
      setInterviewMode(record.interview_mode || 'In-Person');
      setInterviewRemarks(record.interview_remarks || '');
      setOfferDate(record.offer_date || '');
      setPlacementOrHiredDate(record.placement_date || new Date().toISOString().slice(0, 10));
      setAnnualPackage(record.annual_package ? String(record.annual_package) : '');
    } catch (err) {
      console.error(err);
    }
  };

  // Open Candidate Detail Modal
  const openCandidateModal = async (cand: EmployeeCandidateRecord) => {
    try {
      const res = await authFetch(`/api/admin/job-seekers/${cand.candidate_id}`);
      const data = await res.json();
      const record = data.success ? data.data : cand;
      setSelectedCandidate(record);
      setSelectedEmployer(null);
      setNewStatus(record.status);
      setAdminNotes(record.admin_notes || '');
      setStatusRemarks('');
      setInterviewDate(record.interview_date || '');
      setInterviewTime(record.interview_time || '');
      setInterviewMode(record.interview_mode || 'In-Person');
      setInterviewRemarks(record.interview_remarks || '');
      setOfferDate(record.offer_date || '');
      setPlacementOrHiredDate(record.hired_date || new Date().toISOString().slice(0, 10));
      setAnnualPackage(record.annual_package ? String(record.annual_package) : '');
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Employer Status Update
  const handleUpdateEmployerStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployer) return;

    setUpdatingStatus(true);
    setErrorMessage(null);

    try {
      const res = await authFetch(`/api/admin/employer-requirements/${selectedEmployer.requirement_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: statusRemarks,
          admin_notes: adminNotes,
          interview_date: newStatus === 'Interview Scheduled' ? interviewDate : undefined,
          interview_time: newStatus === 'Interview Scheduled' ? interviewTime : undefined,
          interview_mode: newStatus === 'Interview Scheduled' ? interviewMode : undefined,
          interview_remarks: newStatus === 'Interview Scheduled' ? interviewRemarks : undefined,
          offer_date: newStatus === 'Offer Letter' ? offerDate : undefined,
          placement_date: newStatus === 'Placement Successful' ? placementOrHiredDate : undefined,
          annual_package:
            newStatus === 'Placement Successful' || newStatus === 'Offer Letter'
              ? annualPackage
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Status update failed.');
      }

      setFeedbackMessage(data.message);
      setTimeout(() => setFeedbackMessage(null), 4000);

      // Refresh records and close modal
      fetchEmployers('');
      fetchKpis();
      onRefreshPublicStats();
      setSelectedEmployer(null); // Close modal
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Submit Candidate Status Update
  const handleUpdateCandidateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setUpdatingStatus(true);
    setErrorMessage(null);

    try {
      const res = await authFetch(`/api/admin/job-seekers/${selectedCandidate.candidate_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: statusRemarks,
          admin_notes: adminNotes,
          interview_date: newStatus === 'Interview Scheduled' ? interviewDate : undefined,
          interview_time: newStatus === 'Interview Scheduled' ? interviewTime : undefined,
          interview_mode: newStatus === 'Interview Scheduled' ? interviewMode : undefined,
          interview_remarks: newStatus === 'Interview Scheduled' ? interviewRemarks : undefined,
          offer_date: newStatus === 'Offer Letter' ? offerDate : undefined,
          hired_date: newStatus === 'Hired' ? placementOrHiredDate : undefined,
          annual_package:
            newStatus === 'Hired' || newStatus === 'Offer Letter' ? annualPackage : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Status update failed.');
      }

      setFeedbackMessage(data.message);
      setTimeout(() => setFeedbackMessage(null), 4000);

      fetchCandidates('');
      fetchKpis();
      onRefreshPublicStats();
      setSelectedCandidate(null); // Close modal
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update candidate status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Download Handlers
  const handleDownload = (type: 'employer' | 'candidate', format: 'csv' | 'xlsx') => {
    const endpoint =
      type === 'employer'
        ? `/api/admin/export/employer-requirements?format=${format}`
        : `/api/admin/export/job-seekers?format=${format}`;

    // Trigger download with auth header using authFetch & blob
    authFetch(endpoint, {
      method: 'GET',
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SSKJobNetwork_${type === 'employer' ? 'Employers' : 'JobSeekers'}_${
          new Date().toISOString().slice(0, 10)
        }.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('Export download error:', err));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 border border-slate-700 shadow-sm overflow-hidden">
            <img
              src={APP_LOGO_URL}
              alt="SSK Job Network Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                SSK People Foundation Coordination Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
              Administrative Management Desk
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in as <strong className="text-white">{adminUsername}</strong> • Live Database Synchronized
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchKpis();
              fetchEmployers();
              fetchCandidates();
              onRefreshPublicStats();
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
            title="Refresh records"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <button
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-2 sm:px-4 text-xs sm:text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Overview & Impact KPIs
        </button>
        <button
          onClick={() => {
            setActiveTab('employers');
            fetchEmployers();
          }}
          className={`pb-3 px-2 sm:px-4 text-xs sm:text-sm font-bold transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'employers'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4 text-amber-600" />
          <span>Employer Requirements</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 font-mono">
            {employers.length}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('candidates');
            fetchCandidates();
          }}
          className={`pb-3 px-2 sm:px-4 text-xs sm:text-sm font-bold transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'candidates'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>Job Seekers</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 font-mono">
            {candidates.length}
          </span>
        </button>
      </div>

      {/* Global Toast Alert */}
      {feedbackMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB: KPIS & QUICK ACTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Supabase Cloud PostgreSQL Connectivity Card */}
          {false && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 text-white rounded-3xl p-5 sm:p-6 shadow-lg">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                          Supabase PostgreSQL Cloud Database
                        </h3>
                        {supabaseStatus?.connected ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Connected & Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <AlertCircle className="w-3 h-3" />
                            <span>Connecting...</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Host: {supabaseStatus?.host || 'db.yvmwueebtltbbgydkyzk.supabase.co'} • Project: {supabaseStatus?.projectUrl?.replace('https://', '').split('.')[0] || 'yvmwueebtltbbgydkyzk'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="flex items-center space-x-4 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Cloud Latency</span>
                      <span className="font-bold font-mono text-emerald-400">
                        {supabaseStatus?.latencyMs ? `${supabaseStatus?.latencyMs} ms` : 'Active'}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Synced Records</span>
                      <span className="font-bold font-mono text-white">
                        {(supabaseStatus?.counts?.employers ?? 0) + (supabaseStatus?.counts?.candidates ?? 0) + (supabaseStatus?.counts?.history ?? 0)}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Tables</span>
                      <span className="font-bold font-mono text-amber-400">
                        {supabaseStatus?.tables.length ?? 5}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSyncSupabase}
                    disabled={syncingSupabase}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-spin' : ''}`} />
                    <span>{syncingSupabase ? 'Syncing...' : 'Force Cloud Sync'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 15: 6 KPI Cards from Database */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Employer Reqs
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {kpis?.totalRequirements ?? 0}
              </p>
              <span className="text-[10px] text-amber-700 font-semibold mt-1 inline-block">
                {kpis?.sourcingCount ?? 0} in Sourcing
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Job Seekers
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {kpis?.totalJobSeekers ?? 0}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 inline-block">
                Registered profiles
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Interviews
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
                {kpis?.totalInterviews ?? 0}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 inline-block">
                Active scheduled
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Offers Issued
              </span>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
                {kpis?.totalOffers ?? 0}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 inline-block">
                Awaiting joining
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Placements
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                {kpis?.totalPlacements ?? 0}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">
                Avg {kpis?.averageDaysToPlacement ?? 15} Days
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold text-amber-100 uppercase tracking-wider block mb-1">
                Annual Package
              </span>
              <p className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
                {formatINR(kpis?.totalAnnualPackage)}
              </p>
              <span className="text-[10px] text-amber-200 mt-1 inline-block">
                Total Salary Volume
              </span>
            </div>
          </div>

          {/* Status-Wise Recruitment Funnel & Direct Quick Filters */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                    <span>Status-Wise Recruitment Funnel & Quick Desk Filters</span>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full normal-case">
                      Interactive
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click on any stage card below to jump directly to the filtered administrative records.
                  </p>
                </div>
              </div>
            </div>

            {/* Employer Pipeline by Status */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Employer Requirements by Status
                  </h4>
                </div>
                <button
                  onClick={() => handleNavigateToEmployerStatus('')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
                >
                  <span>View All ({Object.values(employerStatusCounts).reduce((a, b) => a + b, 0)})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {employerStatusList.filter((s) => s.value !== '').map((item) => {
                  const count = employerStatusCounts[item.value] || 0;
                  const badge = getStatusBadgeClass(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleNavigateToEmployerStatus(item.value)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-400 hover:shadow-xs text-left transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-600 transition-colors">
                          Filter →
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                          {count}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5 leading-snug truncate" title={item.label}>
                          {item.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Job Seeker Pipeline by Status */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Job Seeker Candidates by Status
                  </h4>
                </div>
                <button
                  onClick={() => handleNavigateToCandidateStatus('')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                >
                  <span>View All ({Object.values(candidateStatusCounts).reduce((a, b) => a + b, 0)})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {candidateStatusList.filter((s) => s.value !== '').map((item) => {
                  const count = candidateStatusCounts[item.value] || 0;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleNavigateToCandidateStatus(item.value)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-400 hover:shadow-xs text-left transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                          Filter →
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                          {count}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5 leading-snug truncate" title={item.label}>
                          {item.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Export Cards (Section 24: Excel & CSV) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center space-x-2">
              <Download className="w-4 h-4 text-amber-600" />
              <span>Export Recruitment Data (Excel & CSV)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Employer Requirements Export</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Export all employer specifications, contact numbers, salary ranges, and hiring metrics.
                  </p>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleDownload('employer', 'xlsx')}
                    className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => handleDownload('employer', 'csv')}
                    className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Job Seekers Export</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Export all candidate profiles, qualifications, contact info, skills, CTC, and status records.
                  </p>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleDownload('candidate', 'xlsx')}
                    className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => handleDownload('candidate', 'csv')}
                    className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EMPLOYER REQUIREMENTS TAB (Section 16) */}
      {/* ========================================================================= */}
      {activeTab === 'employers' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            {/* Status-Wise Filter Pills */}
            <div className="space-y-2 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Status-Wise Filter:
                  </span>
                  {empStatusFilter && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      Active: {empStatusFilter}
                    </span>
                  )}
                </div>
                {empStatusFilter && (
                  <button
                    type="button"
                    onClick={() => handleEmpStatusSelect('')}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
                  >
                    <span>Clear Status</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Pills Bar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {employerStatusList.map((st) => {
                  const isSelected = empStatusFilter === st.value;
                  const count =
                    st.value === ''
                      ? (employerStatusCounts['All'] || employers.length)
                      : (employerStatusCounts[st.value] || 0);

                  return (
                    <button
                      key={st.label}
                      type="button"
                      onClick={() => handleEmpStatusSelect(isSelected && st.value !== '' ? '' : st.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm ring-2 ring-amber-500/60'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                      <span>{st.label}</span>
                      <span
                        className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-slate-800 text-amber-300'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchEmployers()}
                  placeholder="Search by ID, Contact Name, Mobile, or Title..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <select
                  value={empStatusFilter}
                  onChange={(e) => {
                    handleEmpStatusSelect(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">All Statuses ({employerStatusCounts['All'] || employers.length})</option>
                  <option value="Submitted">Submitted ({employerStatusCounts['Submitted'] || 0})</option>
                  <option value="Sourcing">Sourcing ({employerStatusCounts['Sourcing'] || 0})</option>
                  <option value="Interview Scheduled">Interview Scheduled ({employerStatusCounts['Interview Scheduled'] || 0})</option>
                  <option value="Offer Letter">Offer Letter ({employerStatusCounts['Offer Letter'] || 0})</option>
                  <option value="Placement Successful">Placement Successful ({employerStatusCounts['Placement Successful'] || 0})</option>
                  <option value="Rejected">Rejected ({employerStatusCounts['Rejected'] || 0})</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => fetchEmployers()}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Search
                </button>
                <button
                  onClick={() => {
                    setEmpSearch('');
                    setEmpStatusFilter('');
                    setEmpLocationFilter('');
                    setEmpDeptFilter('');
                    fetchEmployers('', '', '', '');
                  }}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Employer Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Req ID</th>
                    <th className="py-3 px-4">Position / Title</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No employer requirements found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    employers.map((emp) => {
                      const badge = getStatusBadgeClass(emp.status);
                      return (
                        <tr
                          key={emp.requirement_id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {emp.requirement_id}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{emp.position_name}</p>
                            <p className="text-[11px] text-slate-500">{emp.job_title} • {emp.department}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-slate-800 font-medium">{emp.contact_name}</p>
                            <p className="text-slate-500 font-mono text-[11px]">+91 {emp.mobile}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {emp.job_location}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {formatDate(emp.submitted_at)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dot}`} />
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => openEmployerModal(emp)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Inspect / Update
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. JOB SEEKERS TAB (Section 17) */}
      {/* ========================================================================= */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            {/* Status-Wise Filter Pills */}
            <div className="space-y-2 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Status-Wise Filter:
                  </span>
                  {candStatusFilter && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                      Active: {candStatusFilter}
                    </span>
                  )}
                </div>
                {candStatusFilter && (
                  <button
                    type="button"
                    onClick={() => handleCandStatusSelect('')}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
                  >
                    <span>Clear Status</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Pills Bar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {candidateStatusList.map((st) => {
                  const isSelected = candStatusFilter === st.value;
                  const count =
                    st.value === ''
                      ? (candidateStatusCounts['All'] || candidates.length)
                      : (candidateStatusCounts[st.value] || 0);

                  return (
                    <button
                      key={st.label}
                      type="button"
                      onClick={() => handleCandStatusSelect(isSelected && st.value !== '' ? '' : st.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm ring-2 ring-emerald-500/60'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                      <span>{st.label}</span>
                      <span
                        className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-slate-800 text-emerald-300'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={candSearch}
                  onChange={(e) => setCandSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
                  placeholder="Search by ID, Name, Mobile, Skills, or Qualification..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <select
                  value={candStatusFilter}
                  onChange={(e) => handleCandStatusSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">All Statuses ({candidateStatusCounts['All'] || candidates.length})</option>
                  <option value="Applied">Applied ({candidateStatusCounts['Applied'] || 0})</option>
                  <option value="Validation">Validation ({candidateStatusCounts['Validation'] || 0})</option>
                  <option value="Interview Scheduled">Interview Scheduled ({candidateStatusCounts['Interview Scheduled'] || 0})</option>
                  <option value="Offer Letter">Offer Letter ({candidateStatusCounts['Offer Letter'] || 0})</option>
                  <option value="Hired">Hired ({candidateStatusCounts['Hired'] || 0})</option>
                  <option value="Rejected">Rejected ({candidateStatusCounts['Rejected'] || 0})</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => fetchCandidates()}
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Search
                </button>
                <button
                  onClick={() => {
                    setCandSearch('');
                    setCandStatusFilter('');
                    setCandLocationFilter('');
                    setCandExpFilter('');
                    setCandImmediateFilter('');
                    fetchCandidates('', '', '', '', '');
                  }}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Candidate ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Qualification / Skills</th>
                    <th className="py-3 px-4">Experience / CTC</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No candidate profiles found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    candidates.map((cand) => {
                      const badge = getStatusBadgeClass(cand.status);
                      return (
                        <tr
                          key={cand.candidate_id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {cand.candidate_id}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{cand.full_name}</p>
                            <p className="text-[11px] text-slate-500">{cand.current_location}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-slate-800 font-mono text-[11px]">+91 {cand.mobile}</p>
                            <p className="text-slate-500 text-[11px]">{cand.email}</p>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-medium text-slate-800">{cand.qualification}</p>
                            <p className="text-[11px] text-slate-500 truncate" title={cand.skills}>
                              {cand.skills}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-slate-800">{cand.total_experience}</p>
                            <p className="text-[11px] text-emerald-700 font-medium">Exp: {cand.expected_ctc}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dot}`} />
                              {cand.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => openCandidateModal(cand)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Inspect / Update
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: EMPLOYER REQUIREMENT DETAIL & STATUS UPDATE (Section 18, 19, 20, 21, 22) */}
      {/* ========================================================================= */}
      {selectedEmployer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Employer Job Requirement
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {selectedEmployer.requirement_id}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedEmployer.position_name} • {selectedEmployer.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contact & Job Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold block">Contact Person:</span>
                <span className="text-slate-900 font-bold">{selectedEmployer.contact_name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Mobile Number:</span>
                <span className="text-slate-900 font-mono font-bold">+91 {selectedEmployer.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Location:</span>
                <span className="text-slate-800">{selectedEmployer.job_location}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Salary Range:</span>
                <span className="text-slate-800 font-semibold">{selectedEmployer.salary_range}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Qualification:</span>
                <span className="text-slate-800">{selectedEmployer.qualification}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Experience Required:</span>
                <span className="text-slate-800">{selectedEmployer.experience_required}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold block">Required Skills:</span>
                <span className="text-slate-800">{selectedEmployer.skills}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold block">Job Description:</span>
                <p className="text-slate-700 mt-1 leading-relaxed">{selectedEmployer.job_description}</p>
              </div>
              {selectedEmployer.days_to_placement !== null && selectedEmployer.days_to_placement !== undefined && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-emerald-800 font-bold">
                  <span>Days to Placement:</span>
                  <span className="font-mono text-sm">{selectedEmployer.days_to_placement} Days</span>
                </div>
              )}
            </div>

            {/* STATUS UPDATE FORM */}
            <form onSubmit={handleUpdateEmployerStatus} className="space-y-4 border-t pt-4 border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Update Status & Recruitment Progress
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Change Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as EmployerStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Sourcing">Sourcing</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Placement Successful">Placement Successful</option>
                </select>
              </div>

              {/* Conditional: Interview Scheduled Details */}
              {newStatus === 'Interview Scheduled' && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-amber-900">Interview Coordination Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 11:30 AM"
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mode</label>
                      <select
                        value={interviewMode}
                        onChange={(e) => setInterviewMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="In-Person">In-Person</option>
                        <option value="Online / Video Call">Online / Video Call</option>
                        <option value="Telephonic">Telephonic</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Interview Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Candidate Rajesh Pawar invited to Chickpet office"
                      value={interviewRemarks}
                      onChange={(e) => setInterviewRemarks(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Conditional: Offer Letter Details */}
              {newStatus === 'Offer Letter' && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-indigo-900">Offer Letter Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Offer Date</label>
                      <input
                        type="date"
                        value={offerDate}
                        onChange={(e) => setOfferDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Offered Annual Package (INR)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 480000"
                        value={annualPackage}
                        onChange={(e) => setAnnualPackage(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Placement Successful Details */}
              {newStatus === 'Placement Successful' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-emerald-900">Placement Confirmation Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Placement Date</label>
                      <input
                        type="date"
                        value={placementOrHiredDate}
                        onChange={(e) => setPlacementOrHiredDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Final Annual Package (INR)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 480000"
                        value={annualPackage}
                        onChange={(e) => setAnnualPackage(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Days to placement will be calculated automatically: <strong>Placement Date − Submission Date</strong>.
                  </p>
                </div>
              )}

              {/* Internal Admin Notes (Private — Section 19) */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Internal Admin Notes (Strictly Confidential — Never Visible to Public)</span>
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record internal comments, interview feedback, verification remarks..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Remarks for Status History */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Public Status Transition Note (Visible in User Timeline)
                </label>
                <input
                  type="text"
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Sourcing candidates from Bengaluru region..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmployer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating Status...' : 'UPDATE STATUS'}
                </button>
              </div>
            </form>

            {/* Audit History Log */}
            {selectedEmployer.history && selectedEmployer.history.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Historical Status Audit Log
                </h4>
                <div className="border-l-2 border-slate-200 ml-2 pl-3 space-y-3">
                  {selectedEmployer.history.map((h, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{h.new_status}</span>
                        {h.previous_status && (
                          <span className="text-slate-400 text-[11px]">from {h.previous_status}</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        {formatDateTime(h.changed_at)} • by {h.changed_by}
                      </p>
                      {h.remarks && <p className="text-slate-600 text-xs mt-0.5">{h.remarks}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: JOB SEEKER PROFILE DETAIL & STATUS UPDATE */}
      {/* ========================================================================= */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Job Seeker Profile
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {selectedCandidate.candidate_id}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedCandidate.full_name} • {selectedCandidate.qualification}
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold block">Full Name:</span>
                <span className="text-slate-900 font-bold">{selectedCandidate.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Mobile:</span>
                <span className="text-slate-900 font-mono font-bold">+91 {selectedCandidate.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Email:</span>
                <span className="text-slate-800">{selectedCandidate.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Current Location:</span>
                <span className="text-slate-800">{selectedCandidate.current_location}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Qualification:</span>
                <span className="text-slate-800">{selectedCandidate.qualification}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Total Experience:</span>
                <span className="text-slate-800">{selectedCandidate.total_experience}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Expected CTC:</span>
                <span className="text-emerald-700 font-bold">{selectedCandidate.expected_ctc}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Immediate Joiner?</span>
                <span className="text-slate-800 font-bold">
                  {selectedCandidate.immediate_joiner ? 'Yes' : 'No (Notice period)'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold block">Skills & Competencies:</span>
                <span className="text-slate-800">{selectedCandidate.skills}</span>
              </div>
            </div>

            {/* STATUS UPDATE FORM */}
            <form onSubmit={handleUpdateCandidateStatus} className="space-y-4 border-t pt-4 border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Update Status & Coordination Stage
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Change Candidate Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as CandidateStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Applied">Applied</option>
                  <option value="Validation">Validation</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Hired">Hired (Confirm Employment)</option>
                  <option value="Rejected">Rejected</option>
                </select>
                {newStatus === 'Hired' && (
                  <p className="text-[11px] text-emerald-800 mt-1 font-medium">
                    Note: Candidate is not automatically marked hired on offer letter. You are manually confirming Hired.
                  </p>
                )}
              </div>

              {/* Conditional: Interview Details */}
              {newStatus === 'Interview Scheduled' && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-amber-900">Interview Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 02:30 PM"
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mode</label>
                      <select
                        value={interviewMode}
                        onChange={(e) => setInterviewMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="In-Person">In-Person</option>
                        <option value="Online / Video Call">Online / Video Call</option>
                        <option value="Telephonic">Telephonic</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Offer Letter Details */}
              {newStatus === 'Offer Letter' && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-indigo-900">Offer Letter Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Offer Date</label>
                      <input
                        type="date"
                        value={offerDate}
                        onChange={(e) => setOfferDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Annual Package (INR)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 360000"
                        value={annualPackage}
                        onChange={(e) => setAnnualPackage(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Hired Details */}
              {newStatus === 'Hired' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-emerald-900">Manual Confirmation: Candidate Hired</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Hired / Joining Date</label>
                      <input
                        type="date"
                        value={placementOrHiredDate}
                        onChange={(e) => setPlacementOrHiredDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Final Annual Package (INR)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 480000"
                        value={annualPackage}
                        onChange={(e) => setAnnualPackage(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Admin Notes */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Internal Admin Notes (Strictly Confidential — Never Visible to Public)</span>
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record confidential notes, verification check details, salary negotiations..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Public Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Public Status Transition Note (Visible in Candidate Timeline)
                </label>
                <input
                  type="text"
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Profile verified by coordination desk..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating Status...' : 'UPDATE STATUS'}
                </button>
              </div>
            </form>

            {/* Audit History Log */}
            {selectedCandidate.history && selectedCandidate.history.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Historical Status Audit Log
                </h4>
                <div className="border-l-2 border-slate-200 ml-2 pl-3 space-y-3">
                  {selectedCandidate.history.map((h, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{h.new_status}</span>
                        {h.previous_status && (
                          <span className="text-slate-400 text-[11px]">from {h.previous_status}</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        {formatDateTime(h.changed_at)} • by {h.changed_by}
                      </p>
                      {h.remarks && <p className="text-slate-600 text-xs mt-0.5">{h.remarks}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
