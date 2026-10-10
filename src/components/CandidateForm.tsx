import React, { useState } from 'react';
import {
  UserCheck,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  IndianRupee,
  Wrench,
  Clock,
  AlertCircle,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { SubmissionConfirmationData } from '../types.ts';
import { supabase } from '../lib/supabase.ts';

interface CandidateFormProps {
  onSuccess: (data: SubmissionConfirmationData) => void;
  onCancel: () => void;
  onCheckStatus: (mobile?: string) => void;
}

export const CandidateForm: React.FC<CandidateFormProps> = ({
  onSuccess,
  onCancel,
  onCheckStatus,
}) => {
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    current_location: '',
    qualification: '',
    total_experience: '',
    current_ctc: '',
    expected_ctc: '',
    skills: '',
    immediate_joiner: true,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) return 'Full Name is required.';
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return 'Please enter a valid 10-digit Indian mobile number (e.g. 9845099881).';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!formData.current_location.trim()) return 'Current Location is required.';
    if (!formData.qualification.trim()) return 'Qualification is required.';
    if (!formData.total_experience.trim()) return 'Total Experience is required.';
    if (!formData.expected_ctc.trim()) return 'Expected CTC is required.';
    if (!formData.skills.trim()) return 'Skills are required.';
    return null;
  };

  const handleSubmit = async (e?: React.FormEvent, forceContinue = false) => {
    if (e) e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let activeUserId: string | null = null;
      let activeToken: string | null = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          activeUserId = sessionData.session.user.id;
          activeToken = sessionData.session.access_token;
        }
      } catch {
        // Fallback for non-authenticated public users
      }

      const response = await fetch('/api/candidate/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          allow_continue: forceContinue,
          user_id: activeUserId,
        }),
      });

      const result = await response.json();

      if (response.status === 409 && result.duplicate) {
        setDuplicateWarning(result);
        setLoading(false);
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit candidate profile.');
      }

      onSuccess({
        type: 'candidate',
        id: result.candidateId,
        status: result.status,
        mobile: formData.mobile,
        name: formData.full_name,
        titleOrRole: formData.qualification + ' • ' + formData.skills.slice(0, 30),
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected network error occurred.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Job Seeker Career Profile
            </h1>
            <p className="text-xs text-slate-500">
              For SSK professionals and community members seeking employment.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-2 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/60">
          No account creation required. After submission, a unique Application ID (e.g. <strong>JOB998</strong>) will be generated. You can check application status anytime using this ID directly — no OTP or password required.
        </p>
      </div>

      {/* Duplicate Alert Card */}
      {duplicateWarning && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-6 text-amber-950 animate-in fade-in">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold">
                A profile associated with this mobile number already exists.
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                You already have a registered candidate profile under <strong>+91 {formData.mobile}</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Continue & Register Updated Profile
                </button>
                <button
                  type="button"
                  onClick={() => onCheckStatus(formData.mobile)}
                  className="px-4 py-2 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors"
                >
                  Check Existing Status
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Edit Information
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Section 1: Personal Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              1. Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Rajesh Pawar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="mobile" className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (10 Digits) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-medium">
                  +91
                </span>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  maxLength={10}
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="9845099881"
                  className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used by SSK coordinators to contact you for job interviews.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                Email ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. rajesh.pawar@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="current_location" className="block text-xs font-bold text-slate-700 mb-1">
                Current Location (City / Town) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="current_location"
                  name="current_location"
                  type="text"
                  required
                  value={formData.current_location}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru, Hubballi, Belagavi, Pune"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Professional Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              2. Professional Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qualification" className="block text-xs font-bold text-slate-700 mb-1">
                Qualification <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="qualification"
                  name="qualification"
                  type="text"
                  required
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g. B.Com / BE CS / MBA / Diploma Mechanical"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="total_experience" className="block text-xs font-bold text-slate-700 mb-1">
                Total Experience <span className="text-rose-500">*</span>
              </label>
              <input
                id="total_experience"
                name="total_experience"
                type="text"
                required
                value={formData.total_experience}
                onChange={handleChange}
                placeholder="e.g. Fresher / 2.5 Years / 5+ Years"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="current_ctc" className="block text-xs font-bold text-slate-700 mb-1">
                Current CTC (Optional)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="current_ctc"
                  name="current_ctc"
                  type="text"
                  value={formData.current_ctc}
                  onChange={handleChange}
                  placeholder="e.g. ₹3,50,000 PA or Fresher"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expected_ctc" className="block text-xs font-bold text-slate-700 mb-1">
                Expected CTC <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="expected_ctc"
                  name="expected_ctc"
                  type="text"
                  required
                  value={formData.expected_ctc}
                  onChange={handleChange}
                  placeholder="e.g. ₹4,50,000 PA or ₹30,000 / month"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="skills" className="block text-xs font-bold text-slate-700 mb-1">
              Skills & Core Competencies <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Wrench className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                id="skills"
                name="skills"
                type="text"
                required
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g. Tally Prime, GST, Sales, CNC Programming, React, Python"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Separate your core skills with commas for quick matching by coordinators.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Immediate Joiner? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, immediate_joiner: true }))}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                  formData.immediate_joiner
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>Yes (Ready to Join Immediately)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, immediate_joiner: false }))}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                  !formData.immediate_joiner
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>No (Serving Notice Period)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            id="submit-candidate-profile-btn"
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Registering Profile...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Register Career Profile</span>
              </>
            )}
          </button>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-900 mb-1">Need help with your profile?</p>
          <p className="text-xs text-emerald-800 mb-3">Our support team is here to help you get started.</p>
          <a href="tel:+918884449689" className="inline-flex items-center space-x-2 text-sm font-bold text-emerald-950 bg-white px-4 py-2 rounded-lg shadow-sm border border-emerald-200 hover:bg-emerald-50">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Call Helpline: +91 888 444 9689</span>
          </a>
        </div>
      </form>
    </div>
  );
};
