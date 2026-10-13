export type AppView =
  | 'home'
  | 'landing'
  | 'employer-form'
  | 'candidate-form'
  | 'submission-success'
  | 'check-status'
  | 'admin-login'
  | 'admin-dashboard'
  | 'privacy-policy';

export type EmployerStatus =
  | 'Submitted'
  | 'Sourcing'
  | 'Interview Scheduled'
  | 'Offer Letter'
  | 'Rejected'
  | 'Placement Successful';

export type CandidateStatus =
  | 'Applied'
  | 'Validation'
  | 'Interview Scheduled'
  | 'Offer Letter'
  | 'Rejected'
  | 'Hired';

export interface ImpactStats {
  applicationsReceived: number;
  interviewsScheduled: number;
  offerLetters: number;
  professionalsPlaced: number;
  annualPackageGenerated: number;
  employerMetrics: {
    totalRequirements: number;
    sourcingCount: number;
    interviewsScheduled: number;
    offerLetters: number;
    successfulPlacements: number;
    averageDaysToPlacement: number;
    totalAnnualPackage: number;
  };
  employeeMetrics: {
    totalApplications: number;
    interviewsScheduled: number;
    offerLetters: number;
    totalHired: number;
    totalAnnualPackage: number;
  };
}

export interface StatusHistoryEntry {
  id?: number;
  record_type?: string;
  record_id?: string;
  previous_status: string | null;
  new_status: string;
  changed_by?: string;
  changed_at: string;
  remarks: string | null;
}

export interface EmployerRequirementRecord {
  id: number;
  requirement_id: string;
  business_name?: string;
  company_website?: string | null;
  email?: string | null;
  contact_name: string;
  mobile: string;
  job_title: string;
  department: string;
  position_name: string;
  job_location: string;
  qualification: string;
  experience_required: string;
  skills: string;
  job_description: string;
  salary_range: string;
  hiring_deadline: string;
  status: EmployerStatus;
  submitted_at: string;
  status_updated_at: string;
  interview_date?: string | null;
  interview_time?: string | null;
  interview_mode?: string | null;
  interview_remarks?: string | null;
  offer_date?: string | null;
  placement_date?: string | null;
  annual_package?: number | null;
  admin_notes?: string | null;
  days_to_placement?: number | null;
  timeline?: StatusHistoryEntry[];
  history?: StatusHistoryEntry[];
}

export interface EmployeeCandidateRecord {
  id: number;
  candidate_id: string;
  full_name: string;
  mobile: string;
  email: string;
  current_location: string;
  qualification: string;
  total_experience: string;
  current_ctc?: string | null;
  expected_ctc: string;
  skills: string;
  immediate_joiner: number;
  status: CandidateStatus;
  applied_at: string;
  status_updated_at: string;
  interview_date?: string | null;
  interview_time?: string | null;
  interview_mode?: string | null;
  interview_remarks?: string | null;
  offer_date?: string | null;
  hired_date?: string | null;
  annual_package?: number | null;
  admin_notes?: string | null;
  timeline?: StatusHistoryEntry[];
  history?: StatusHistoryEntry[];
}

export interface SubmissionConfirmationData {
  type: 'employer' | 'candidate';
  id: string;
  status: string;
  mobile: string;
  name: string;
  titleOrRole: string;
  businessName?: string;
}

export interface PublicJobPosting {
  id: number;
  requirement_id: string;
  business_name?: string;
  job_title: string;
  department: string;
  position_name: string;
  job_location: string;
  qualification: string;
  experience_required: string;
  skills: string;
  job_description: string;
  salary_range: string;
  status: string;
  submitted_at: string;
}
