import React, { useState } from 'react';
import {
  Briefcase,
  User,
  Phone,
  MapPin,
  GraduationCap,
  Award,
  Calendar,
  IndianRupee,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
  Building,
  Globe,
  Mail,
} from 'lucide-react';
import { SubmissionConfirmationData } from '../types.ts';
import { supabase } from '../lib/supabase.ts';

interface EmployerFormProps {
  onSuccess: (data: SubmissionConfirmationData) => void;
  onCancel: () => void;
  onCheckStatus: (mobile?: string) => void;
}

export const EmployerForm: React.FC<EmployerFormProps> = ({
  onSuccess,
  onCancel,
  onCheckStatus,
}) => {
  const [formData, setFormData] = useState({
    business_name: '',
    company_website: '',
    email: '',
    contact_name: '',
    mobile: '',
    job_title: '',
    department: '',
    position_name: '',
    job_location: '',
    qualification: '',
    experience_required: '',
    skills: '',
    job_description: '',
    salary_range: '',
    hiring_deadline: '',
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
    // 1. Business Name - Mandatory
    if (!formData.business_name.trim()) return 'Business Name is required.';

    // 2. Company Website - Optional (validate only when entered)
    if (formData.company_website.trim()) {
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i;
      if (!urlPattern.test(formData.company_website.trim())) {
        return 'Please enter a valid Company Website URL (e.g. https://www.example.com or example.com).';
      }
    }

    // 3. Email Address - Optional (validate only when entered)
    if (formData.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email.trim())) {
        return 'Please enter a valid Email Address (e.g. contact@business.com).';
      }
    }

    // 4. Contact Information
    if (!formData.contact_name.trim()) return 'Contact Name is required.';
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return 'Please enter a valid 10-digit Indian mobile number (e.g. 9845012345).';
    }

    // 5. Job Details
    if (!formData.job_title.trim()) return 'Job Title is required.';
    if (!formData.department.trim()) return 'Department is required.';
    if (!formData.position_name.trim()) return 'Position Name is required.';
    if (!formData.job_location.trim()) return 'Job Location (Area + City) is required.';
    if (!formData.qualification.trim()) return 'Education Qualification is required.';
    if (!formData.experience_required.trim()) return 'Experience Required is required.';
    if (!formData.skills.trim()) return 'Skills Required is required.';
    if (!formData.job_description.trim()) return 'Job Description is required.';
    if (!formData.salary_range.trim()) return 'Salary Range is required.';
    if (!formData.hiring_deadline) return 'Last Date of Hiring is required.';
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

      const response = await fetch('/api/employer/register', {
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

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error(`Server returned an invalid response (status ${response.status}). Please try again later.`);
      }

      if (response.status === 409 && result.duplicate) {
        setDuplicateWarning(result);
        setLoading(false);
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit employer requirement.');
      }

      onSuccess({
        type: 'employer',
        id: result.requirementId,
        status: result.status,
        mobile: formData.mobile,
        name: formData.contact_name,
        titleOrRole: formData.position_name,
        businessName: formData.business_name,
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Post Employer Job Requirement
            </h1>
            <p className="text-xs text-slate-500">
              For SSK business owners and organizations hiring community talent.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-2 bg-amber-50/70 p-3 rounded-lg border border-amber-200/60">
          No account registration required. After submission, a unique Requirement ID (e.g. <strong>EMP001</strong>) will be assigned to track status directly without any OTP or password.
        </p>
      </div>

      {/* Duplicate Alert Modal/Card */}
      {duplicateWarning && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-6 text-amber-950 animate-in fade-in">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold">
                A profile associated with this mobile number already exists.
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                You already have an existing requirement or profile recorded under <strong>+91 {formData.mobile}</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Continue & Submit Additional Requirement
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
                  Edit Form
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

      {/* Main Form */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Section 1: Business & Contact Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              1. Business & Contact Information
            </h2>
          </div>

          {/* Business Name - Mandatory */}
          <div>
            <label htmlFor="business_name" className="block text-xs font-bold text-slate-700 mb-1">
              Business Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                id="business_name"
                name="business_name"
                type="text"
                required
                value={formData.business_name}
                onChange={handleChange}
                placeholder="e.g. Somavamsha Silks & Textiles / Shree Enterprises"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Official name of your company, firm, shop, or enterprise.</p>
          </div>

          {/* Company Website & Email Address - Both Optional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="company_website" className="block text-xs font-bold text-slate-700 mb-1">
                Company Website <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="company_website"
                  name="company_website"
                  type="text"
                  value={formData.company_website}
                  onChange={handleChange}
                  placeholder="e.g. https://www.example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Optional. Link to company website or online portfolio.</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. contact@business.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Optional. For receiving applicant alerts directly.</p>
            </div>
          </div>

          {/* Contact Person & Mobile Number - Mandatory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label htmlFor="contact_name" className="block text-xs font-bold text-slate-700 mb-1">
                Contact Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="contact_name"
                  name="contact_name"
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="e.g. Suresh Khatri / Organization Head"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
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
                  placeholder="9845012345"
                  className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used by SSK coordinators to contact you regarding candidates.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Job Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              2. Job Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="job_title" className="block text-xs font-bold text-slate-700 mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="job_title"
                name="job_title"
                type="text"
                required
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g. Accounts Executive"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-xs font-bold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                id="department"
                name="department"
                type="text"
                required
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Finance / Retail / IT / Operations"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="position_name" className="block text-xs font-bold text-slate-700 mb-1">
                Position Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="position_name"
                name="position_name"
                type="text"
                required
                value={formData.position_name}
                onChange={handleChange}
                placeholder="e.g. Senior Accountant"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job_location" className="block text-xs font-bold text-slate-700 mb-1">
                Job Location (Area + City) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="job_location"
                  name="job_location"
                  type="text"
                  required
                  value={formData.job_location}
                  onChange={handleChange}
                  placeholder="e.g. Chickpet, Bengaluru or Hubballi"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="qualification" className="block text-xs font-bold text-slate-700 mb-1">
                Education Qualification <span className="text-rose-500">*</span>
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
                  placeholder="e.g. B.Com / Diploma / Any Graduate / BE"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="experience_required" className="block text-xs font-bold text-slate-700 mb-1">
                Experience Required <span className="text-rose-500">*</span>
              </label>
              <input
                id="experience_required"
                name="experience_required"
                type="text"
                required
                value={formData.experience_required}
                onChange={handleChange}
                placeholder="e.g. Fresher / 1-3 Years / 4+ Years"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="skills" className="block text-xs font-bold text-slate-700 mb-1">
                Skills Required <span className="text-rose-500">*</span>
              </label>
              <input
                id="skills"
                name="skills"
                type="text"
                required
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g. Tally Prime, GST, Billing, Excel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="job_description" className="block text-xs font-bold text-slate-700 mb-1">
              Job Description & Roles <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="job_description"
              name="job_description"
              rows={3}
              required
              value={formData.job_description}
              onChange={handleChange}
              placeholder="Provide a brief summary of day-to-day responsibilities, working hours, and expectations..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="salary_range" className="block text-xs font-bold text-slate-700 mb-1">
                Salary Range (Per Month or Per Annum) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="salary_range"
                  name="salary_range"
                  type="text"
                  required
                  value={formData.salary_range}
                  onChange={handleChange}
                  placeholder="e.g. ₹25,000 - ₹35,000 / month or ₹4.5 LPA"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="hiring_deadline" className="block text-xs font-bold text-slate-700 mb-1">
                Last Date of Hiring <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="hiring_deadline"
                  name="hiring_deadline"
                  type="date"
                  required
                  value={formData.hiring_deadline}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            id="submit-employer-requirement-btn"
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-600/20 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Submitting Requirement...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Job Requirement</span>
              </>
            )}
          </button>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-200">
          <p className="text-sm font-semibold text-amber-900 mb-1">Need help with your posting?</p>
          <p className="text-xs text-amber-800 mb-3">Our support team is here to help you get the best candidates.</p>
          <a href="tel:+918884449689" className="inline-flex items-center space-x-2 text-sm font-bold text-amber-950 bg-white px-4 py-2 rounded-lg shadow-sm border border-amber-200 hover:bg-amber-50">
            <Phone className="w-4 h-4 text-amber-600" />
            <span>Call Helpline: +91 888 444 9689</span>
          </a>
        </div>
      </form>
    </div>
  );
};
