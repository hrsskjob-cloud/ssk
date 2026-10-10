import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  UserCheck,
  Search,
  TrendingUp,
  Award,
  Users2,
  CalendarCheck,
  FileCheck2,
  CheckCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  Building,
  Clock,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  HelpCircle,
  Layers,
  ShoppingBag,
  Cpu,
  Calculator,
  Shirt,
  Wrench,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { AppView, ImpactStats, PublicJobPosting } from '../types.ts';
import { formatINR, formatDate } from '../utils/formatters.ts';
import { APP_LOGO_URL } from '../constants/branding.ts';

interface LandingViewProps {
  onNavigate: (view: AppView) => void;
  onCheckStatus?: (id?: string) => void;
  stats: ImpactStats | null;
  loadingStats: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  onCheckStatus,
  stats,
  loadingStats,
}) => {
  // Quick status check search inside hero
  const [quickStatusId, setQuickStatusId] = useState('');

  // Public jobs state
  const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobSearch, setJobSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch public active jobs
  useEffect(() => {
    const fetchPublicJobs = async () => {
      try {
        setLoadingJobs(true);
        const res = await fetch('/api/public/jobs');
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      } catch (err) {
        console.error('Failed to load active jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchPublicJobs();
  }, []);

  const handleQuickStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCheckStatus) {
      onCheckStatus(quickStatusId.trim());
    } else {
      onNavigate('check-status');
    }
  };

  // Filter jobs by search and department
  const filteredJobs = jobs.filter((job) => {
    const matchesDept =
      selectedDept === 'All' ||
      job.department.toLowerCase().includes(selectedDept.toLowerCase()) ||
      job.job_title.toLowerCase().includes(selectedDept.toLowerCase());

    const term = jobSearch.toLowerCase().trim();
    if (!term) return matchesDept;

    const matchesSearch =
      job.job_title.toLowerCase().includes(term) ||
      job.position_name.toLowerCase().includes(term) ||
      job.job_location.toLowerCase().includes(term) ||
      job.skills.toLowerCase().includes(term) ||
      job.department.toLowerCase().includes(term);

    return matchesDept && matchesSearch;
  });

  const departments = ['All', 'Finance & Accounts', 'Engineering', 'Retail', 'Operations'];

  // Industry sectors
  const communitySectors = [
    {
      icon: <Shirt className="w-5 h-5 text-amber-700" />,
      title: 'Textile, Silk & Apparel',
      desc: 'Wholesale, retail showrooms, fabric production, and merchant stores across Bengaluru, Hubballi & Surat.',
    },
    {
      icon: <Calculator className="w-5 h-5 text-emerald-700" />,
      title: 'Accounts, GST & Finance',
      desc: 'Tally Prime, audit finalization, direct & indirect taxation, and commercial accounting.',
    },
    {
      icon: <Cpu className="w-5 h-5 text-blue-700" />,
      title: 'Information Technology & Software',
      desc: 'Full-stack engineering, web development, QA testing, IT infrastructure, and technical support.',
    },
    {
      icon: <ShoppingBag className="w-5 h-5 text-purple-700" />,
      title: 'Retail Showrooms & Billing',
      desc: 'Store supervisors, counter sales executives, inventory controllers, and customer managers.',
    },
    {
      icon: <Wrench className="w-5 h-5 text-orange-700" />,
      title: 'Precision Engineering & CNC',
      desc: 'Toolroom technicians, CNC machine operators, production supervisors, and industrial units.',
    },
    {
      icon: <Layers className="w-5 h-5 text-indigo-700" />,
      title: 'Administration & Operations',
      desc: 'Office management, procurement, front desk, logistics, and business coordinators.',
    },
  ];

  // FAQ items
  const faqItems = [
    {
      q: 'Is this recruitment service completely free for candidates and employers?',
      a: 'Yes, 100% free. SSK Job Network is an official welfare initiative by SSK People Foundation. No registration fees, placement cuts, or hidden commissions are ever collected from applicants or business owners.',
    },
    {
      q: 'How do I check my application or requirement status without a login password?',
      a: 'After submitting a form, you receive a unique Reference ID (e.g. EMP001 for employers, JOB998 for candidates). You can enter this ID on the "Check Status" page to view your live recruitment timeline, scheduled interviews, and coordinator updates immediately.',
    },
    {
      q: 'Who verifies the submitted job requirements and candidate profiles?',
      a: 'All records are reviewed and validated by dedicated SSK People Foundation coordination volunteers. This ensures legitimate business opportunities for candidates and trustworthy professionals for employers.',
    },
    {
      q: 'Can fresh graduates and experienced professionals both apply?',
      a: 'Yes. Opportunities span across entry-level roles (billing, junior accounts, trainees) as well as senior positions (chartered accountants, senior software engineers, retail store managers, unit heads).',
    },
    {
      q: 'How are candidate interviews coordinated with employers?',
      a: 'Once a profile matches an employer requirement, SSK coordinators contact both parties to schedule an interview (either in-person at the employer premises or via telephonic/online mode) and keep both parties updated.',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION & PRIMARY DECISION CARDS */}
      {/* ========================================================================= */}
      <section className="relative pt-6 sm:pt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          {/* Trust badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-4 shadow-2xs">
            <img
              src={APP_LOGO_URL}
              alt="SSK People Foundation"
              className="w-4 h-4 rounded-full object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <span>Official Community Staffing Portal • SSK People Foundation</span>
          </div>

          {/* Hero Headline - Balanced scale */}
          <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-black text-slate-950 tracking-tight leading-snug sm:leading-tight uppercase font-sans">
            NO SSK PROFESSIONAL SHOULD FEEL JOBLESS WHEN THEY HAVE THE DESIRE TO WORK.
          </h1>

          {/* Supporting Text */}
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            <strong>SSK Job Network</strong> bridges SSK Business Owners with SSK Professionals to create
            meaningful employment, transparent recruitment, and a prosperous community economy.
          </p>

          {/* Core Workflow Tag */}
          <div className="mt-3.5 inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100/90 px-3.5 py-1.5 rounded-full border border-slate-200">
            <span>Capture</span>
            <span className="text-amber-600 font-bold">→</span>
            <span>Validate</span>
            <span className="text-amber-600 font-bold">→</span>
            <span>Coordinate</span>
            <span className="text-amber-600 font-bold">→</span>
            <span>Track</span>
            <span className="text-amber-600 font-bold">→</span>
            <span className="text-emerald-700 font-bold">Measure Impact</span>
          </div>
        </div>

        {/* 2 LARGE PRIMARY OPTIONS (Directly visible in Hero) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {/* Option A: I AM AN EMPLOYER */}
          <div
            id="employer-cta-card"
            onClick={() => onNavigate('employer-form')}
            className="group relative cursor-pointer rounded-2xl bg-white p-6 sm:p-7 border-2 border-slate-200 hover:border-amber-600 transition-all duration-200 shadow-sm hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-700 mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                For Business Owners & Organizations
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 mb-1.5 tracking-tight">
                I AM AN EMPLOYER
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Looking to hire trustworthy talent from our SSK community? Post your job requirements in 2 minutes. Receive a unique <strong>EMP</strong> ID to track progress.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-amber-800 group-hover:text-amber-900 flex items-center space-x-1.5">
                <span>Post Requirement</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                100% Free Service
              </span>
            </div>
          </div>

          {/* Option B: I AM LOOKING FOR A JOB */}
          <div
            id="candidate-cta-card"
            onClick={() => onNavigate('candidate-form')}
            className="group relative cursor-pointer rounded-2xl bg-white p-6 sm:p-7 border-2 border-slate-200 hover:border-emerald-600 transition-all duration-200 shadow-sm hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                For SSK Professionals & Seekers
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 mb-1.5 tracking-tight">
                I AM LOOKING FOR A JOB
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Seeking a career breakthrough or fresh start? Register your profile. Receive a unique <strong>JOB</strong> ID and get connected with verified community employers.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-emerald-800 group-hover:text-emerald-900 flex items-center space-x-1.5">
                <span>Register Career Profile</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Confidential & Direct
              </span>
            </div>
          </div>
        </div>

        {/* QUICK STATUS TRACKER BAR */}
        <div className="mt-6 max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
          <form
            onSubmit={handleQuickStatusSubmit}
            className="flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 shrink-0">
              <Search className="w-4 h-4 text-amber-600" />
              <span>Track Application / Requirement:</span>
            </div>
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={quickStatusId}
                onChange={(e) => setQuickStatusId(e.target.value.toUpperCase())}
                placeholder="Enter ID (e.g. EMP001 or JOB998)"
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1 shrink-0"
            >
              <span>Check Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ACTIVE COMMUNITY JOB OPENINGS BOARD (HIDDEN) */}
      {/* ========================================================================= */}
      {/*
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-700" />
                <span>Verified Community Vacancies</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ACTIVE JOB OPENINGS
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Explore open positions posted by SSK enterprises. Apply or register to be considered immediately.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    selectedDept === dept
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder="Search by job role, skills (e.g. Tally, React, Sales), or location (e.g. Bengaluru, Hubballi)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {loadingJobs ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading active community job openings...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-slate-700">No vacancies matching your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</p>
              <button
                onClick={() => {
                  setJobSearch('');
                  setSelectedDept('All');
                }}
                className="mt-3 text-xs font-bold text-amber-700 underline"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-[#FCFAF7] border border-slate-200 rounded-2xl p-5 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                        {job.requirement_id}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {formatDate(job.submitted_at)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {job.position_name}
                    </h3>
                    <p className="text-xs font-medium text-amber-800 mt-0.5">{job.department}</p>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{job.job_location || 'Karnataka'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Exp: {job.experience_required || 'Any'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-800">₹</span>
                        <span className="font-semibold text-slate-800">{job.salary_range || 'Best in Industry'}</span>
                      </div>
                    </div>

                    {Boolean(job.skills && typeof job.skills === 'string') && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {String(job.skills)
                          .split(',')
                          .slice(0, 3)
                          .map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                            >
                              {s.trim()}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                    <button
                      onClick={() => onNavigate('candidate-form')}
                      className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>Are you a business owner with open vacancies in your organization?</span>
            <button
              onClick={() => onNavigate('employer-form')}
              className="font-bold text-amber-700 hover:text-amber-800 underline"
            >
              Post a Requirement Free →
            </button>
          </div>
        </div>
      </section>
      */}

      {/* ========================================================================= */}
      {/* 3. KEY COMMUNITY SECTORS & CAREER DOMAINS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Community Focus
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
            CORE SECTORS & CAREER DOMAINS
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
            SSK Job Network caters to diverse professions and traditional business strengths of the SSK community.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communitySectors.map((sector, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-xs transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                {sector.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{sector.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{sector.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Community Workflow
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
              HOW IT WORKS
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              A transparent, human-centered bridge between SSK enterprises and job seekers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Step 01 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 relative">
              <div className="text-2xl sm:text-3xl font-black text-amber-500 mb-1.5 font-mono">
                01
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide mb-1.5">
                REGISTER IN 2 MINUTES
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Employers submit requirements (EMP ID assigned). Candidates submit career profiles (JOB ID assigned). No login passwords or charges.
              </p>
            </div>

            {/* Step 02 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 relative">
              <div className="text-2xl sm:text-3xl font-black text-amber-500 mb-1.5 font-mono">
                02
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide mb-1.5">
                VALIDATE & CONNECT
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                SSK People Foundation volunteers review, validate, and match suitable profiles with job openings with dignity and speed.
              </p>
            </div>

            {/* Step 03 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 relative">
              <div className="text-2xl sm:text-3xl font-black text-amber-500 mb-1.5 font-mono">
                03
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide mb-1.5">
                INTERVIEW & GROW
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Interviews are scheduled with official status updates. Verified placements strengthen the community economy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. COMMUNITY IMPACT (Live dynamic metrics from database) */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Database Synchronized</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            COMMUNITY IMPACT
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Real outcomes created for the SSK community. Calculated dynamically from verified platform records.
          </p>
        </div>

        {/* 5 Specific Impact Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Applications Received */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2.5">
              <Users2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {loadingStats ? '...' : stats?.applicationsReceived ?? 0}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Applications Received
              </p>
            </div>
          </div>

          {/* 2. Interviews Scheduled */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2.5">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {loadingStats ? '...' : stats?.interviewsScheduled ?? 0}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Interviews Scheduled
              </p>
            </div>
          </div>

          {/* 3. Offer Letters */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2.5">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {loadingStats ? '...' : stats?.offerLetters ?? 0}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Offer Letters Issued
              </p>
            </div>
          </div>

          {/* 4. Professionals Placed */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                {loadingStats ? '...' : stats?.professionalsPlaced ?? 0}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Professionals Placed
              </p>
            </div>
          </div>

          {/* 5. Annual Package Generated */}
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center mb-2.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">
                {loadingStats ? '...' : formatINR(stats?.annualPackageGenerated)}
              </p>
              <p className="text-xs font-semibold text-amber-100 mt-0.5">
                Annual Package Generated
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. VALUES & FOUNDATION ASSURANCE */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-slate-200 bg-white rounded-3xl p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Zero Commercial Exploitation</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  No candidate registration charges, placement cuts, or hidden commissions. Pure community welfare service.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Human Verification & Dignity</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Every profile and job post is verified by dedicated SSK People Foundation volunteers to prevent fraud.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Instant Status Tracking by ID</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Track live hiring and interview progress instantly with your unique EMP or JOB reference ID — no OTP or password needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Common questions about the SSK Community Staffing Platform.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left px-5 py-4 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 hover:text-amber-800 transition-colors"
              >
                <span>{item.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-amber-700 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. COMMUNITY SUPPORT & HELPLINE ASSISTANCE */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Need Help Registering or Posting a Job?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                Our SSK People Foundation volunteers are here to assist community elders, business owners, and youth who need offline or telephonic help.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                <span className="flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-amber-700" />
                  <span>sskjobsdigital@gmail.com</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <Building className="w-4 h-4 text-amber-700" />
                  <span>Bengaluru, Karnataka</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => onNavigate('check-status')}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-colors shadow-2xs"
            >
              Track Existing ID
            </button>
            <button
              onClick={() => onNavigate('employer-form')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 transition-colors"
            >
              Post a Requirement
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
