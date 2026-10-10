import React from 'react';
import { AppView } from '../types.ts';

interface PrivacyPolicyProps {
  onNavigate: (view: AppView) => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: September 29, 2026</p>

        <div className="space-y-6 text-slate-700">
          <p>
            At <strong>SSK Job Network</strong>, we respect your privacy and are committed to protecting the information you share with us. This Privacy Policy outlines how we collect, use, and safeguard your data.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Job Seekers:</strong> Name, mobile number, email, profile information, education, experience, skills, and job preferences.</li>
            <li><strong>Employers:</strong> Contact name, mobile number, job posting details, and organization information.</li>
            <li><strong>Applications:</strong> Information submitted during the job application process.</li>
          </ul>

          <h2 className="text-xl font-semibold text-slate-900">2. How We Use Information</h2>
          <p>We use the collected information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Facilitate job matching between job seekers and employers.</li>
            <li>Communicate with you regarding application status or job requirements.</li>
            <li>Improve our services and user experience.</li>
          </ul>

          <h2 className="text-xl font-semibold text-slate-900">3. Job Applications & Data Sharing</h2>
          <p>
            When you apply for a job, relevant information from your profile is shared with the respective employer to facilitate the hiring process. Employers are expected to handle this information responsibly.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">4. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your information from unauthorized access, alteration, or disclosure. However, no data transmission over the internet is completely secure.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">5. User Rights & Choices</h2>
          <p>
            You may request access to, correction of, or deletion of your personal information by contacting us.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">6. Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated "Last Updated" date.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">7. Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this Privacy Policy, please contact us at:
            <br />
            <strong>[Privacy Contact Email]</strong>
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100">
          <button
            onClick={() => onNavigate('home')}
            className="text-amber-700 hover:text-amber-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
