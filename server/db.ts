import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Force disable SSL verification for self-signed certificates in Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

// Supabase Configuration from Environment
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://yvmwueebtltbbgydkyzk.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bXd1ZWVidGx0YmJneWRreXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MzQzNTgsImV4cCI6MjEwNzIxMDM1OH0.Ok5LejpDSmkk65y-MoxNQuRqN6SlIGs2QqPTsJ7JQ9k";

export const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

export const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 6000,
});

export interface EmployerRequirement {
  id: number;
  requirement_id: string;
  user_id?: string | null;
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
  status: string;
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
}

export interface EmployeeCandidate {
  id: number;
  candidate_id: string;
  user_id?: string | null;
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
  status: string;
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
}

export interface StatusHistoryItem {
  id: number;
  record_type: "EMPLOYER" | "CANDIDATE";
  record_id: string;
  employer_id?: number | null;
  candidate_id?: number | null;
  user_id?: string | null;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  changed_at: string;
  remarks: string | null;
}

export interface Statement {
  bind(params?: any[]): boolean;
  step(): boolean;
  getAsObject(): any;
  get(params?: any[]): any;
  all(params?: any[]): any[];
  free(): void;
}

export interface Database {
  prepare(sql: string): Statement;
  run(sql: string, params?: any[]): void;
  exec(sql: string): any;
  export(): Uint8Array;
}

class PureStatement implements Statement {
  private rows: any[] = [];
  private index: number = 0;
  private bound: boolean = false;
  private sql: string;
  private db: PureDatabase;

  constructor(sql: string, db: PureDatabase) {
    this.sql = sql;
    this.db = db;
  }

  bind(params: any[] = []): boolean {
    this.rows = this.db.executeSelect(this.sql, params);
    this.index = 0;
    this.bound = true;
    return true;
  }

  step(): boolean {
    if (!this.bound && this.index === 0) {
      this.rows = this.db.executeSelect(this.sql, []);
      this.bound = true;
    }
    if (this.index < this.rows.length) {
      this.index++;
      return true;
    }
    return false;
  }

  getAsObject(): any {
    return this.rows[this.index - 1] || {};
  }

  get(params?: any[]): any {
    const list = this.db.executeSelect(this.sql, params || []);
    return list[0];
  }

  all(params?: any[]): any[] {
    return this.db.executeSelect(this.sql, params || []);
  }

  free(): void {
    this.rows = [];
    this.index = 0;
    this.bound = false;
  }
}

export class PureDatabase implements Database {
  tables: {
    employer_requirements: EmployerRequirement[];
    employee_candidates: EmployeeCandidate[];
    status_history: StatusHistoryItem[];
    otp_sessions: any[];
    admin_sessions: any[];
  } = {
    employer_requirements: [],
    employee_candidates: [],
    status_history: [],
    otp_sessions: [],
    admin_sessions: []
  };

  prepare(sql: string): Statement {
    return new PureStatement(sql, this);
  }

  executeSelect(sql: string, params: any[] = []): any[] {
    const s = sql.replace(/\s+/g, " ").trim();

    // 1. Community impact stats
    if (s.includes("total_candidates") && s.includes("candidate_interviews")) {
      const cands = this.tables.employee_candidates;
      return [{
        total_candidates: cands.length,
        candidate_interviews: cands.filter(r => r.status === "Interview Scheduled").length,
        candidate_offers: cands.filter(r => r.status === "Offer Letter").length,
        candidate_hired: cands.filter(r => r.status === "Hired").length,
        candidate_package_sum: cands.filter(r => r.status === "Hired").reduce((sum, r) => sum + Number(r.annual_package || 0), 0)
      }];
    }

    if (s.includes("total_requirements") && s.includes("employer_sourcing")) {
      const emps = this.tables.employer_requirements;
      const placed = emps.filter(r => r.status === "Placement Successful");
      const validDays = placed.filter(r => r.days_to_placement != null);
      const avgDays = validDays.length ? validDays.reduce((sum, r) => sum + Number(r.days_to_placement || 0), 0) / validDays.length : 15;
      return [{
        total_requirements: emps.length,
        employer_sourcing: emps.filter(r => r.status === "Sourcing").length,
        employer_interviews: emps.filter(r => r.status === "Interview Scheduled").length,
        employer_offers: emps.filter(r => r.status === "Offer Letter").length,
        employer_placements: placed.length,
        avg_days_to_placement: Math.round(avgDays),
        employer_package_sum: placed.reduce((sum, r) => sum + Number(r.annual_package || 0), 0)
      }];
    }

    // 2. Aggregate count / sum / avg queries
    if (s.startsWith("SELECT COUNT(*) as count FROM employer_requirements")) {
      const statusMatch = s.match(/WHERE status = '([^']+)'/);
      let list = this.tables.employer_requirements;
      if (statusMatch) list = list.filter(r => r.status === statusMatch[1]);
      return [{ count: list.length }];
    }
    if (s.startsWith("SELECT COUNT(*) as count FROM employee_candidates")) {
      const statusMatch = s.match(/WHERE status = '([^']+)'/);
      let list = this.tables.employee_candidates;
      if (statusMatch) list = list.filter(r => r.status === statusMatch[1]);
      return [{ count: list.length }];
    }
    if (s.includes("AVG(days_to_placement) as avg_days")) {
      const placed = this.tables.employer_requirements.filter(r => r.status === "Placement Successful" && r.days_to_placement != null);
      const avg = placed.length ? placed.reduce((acc, r) => acc + Number(r.days_to_placement || 0), 0) / placed.length : 15;
      return [{ avg_days: Math.round(avg) }];
    }
    if (s.includes("sum_pkg FROM employer_requirements")) {
      const placed = this.tables.employer_requirements.filter(r => r.status === "Placement Successful");
      const sum = placed.reduce((acc, r) => acc + Number(r.annual_package || 0), 0);
      return [{ sum_pkg: sum }];
    }
    if (s.includes("sum_pkg FROM employee_candidates")) {
      const hired = this.tables.employee_candidates.filter(r => r.status === "Hired");
      const sum = hired.reduce((acc, r) => acc + Number(r.annual_package || 0), 0);
      return [{ sum_pkg: sum }];
    }

    // 3. Admin session check: SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?
    if (s.includes("FROM admin_sessions")) {
      const token = params[0];
      const expiresAt = Number(params[1] || 0);
      return this.tables.admin_sessions.filter(r => r.token === token && Number(r.expires_at) > expiresAt);
    }

    // 4. OTP sessions:
    if (s.includes("FROM otp_sessions WHERE mobile = ?")) {
      const mobile = String(params[0] || "");
      return this.tables.otp_sessions.filter(r => String(r.mobile) === mobile);
    }
    if (s.includes("FROM otp_sessions WHERE verified_token = ?")) {
      const token = String(params[0] || "");
      return this.tables.otp_sessions.filter(r => String(r.verified_token) === token);
    }

    // 5. Code uniqueness:
    if (s.includes("FROM employer_requirements WHERE UPPER(requirement_id) = ?")) {
      const code = String(params[0] || "").toUpperCase();
      return this.tables.employer_requirements.filter(r => String(r.requirement_id || "").toUpperCase() === code);
    }
    if (s.includes("FROM employee_candidates WHERE UPPER(candidate_id) = ?")) {
      const code = String(params[0] || "").toUpperCase();
      return this.tables.employee_candidates.filter(r => String(r.candidate_id || "").toUpperCase() === code);
    }

    // 6. Mobile duplicate checks:
    if (s.includes("FROM employer_requirements WHERE mobile = ?")) {
      const mobile = String(params[0] || "");
      return this.tables.employer_requirements.filter(r => String(r.mobile) === mobile);
    }
    if (s.includes("FROM employee_candidates WHERE mobile = ?")) {
      const mobile = String(params[0] || "");
      return this.tables.employee_candidates.filter(r => String(r.mobile) === mobile);
    }

    // 7. Status Lookup: SELECT * FROM ... WHERE ..._id = ? OR id = ?
    if (s.includes("FROM employer_requirements WHERE requirement_id = ? OR id = ?")) {
      const id = String(params[0] || "");
      return this.tables.employer_requirements.filter(r => String(r.requirement_id) === id || String(r.id) === id);
    }
    if (s.includes("FROM employee_candidates WHERE candidate_id = ? OR id = ?")) {
      const id = String(params[0] || "");
      return this.tables.employee_candidates.filter(r => String(r.candidate_id) === id || String(r.id) === id);
    }

    // 8. Status History:
    if (s.includes("FROM status_history")) {
      let list = this.tables.status_history;
      if (s.includes("record_type = 'EMPLOYER'")) {
        const id = String(params[0] || "");
        list = list.filter(r => r.record_type === "EMPLOYER" && (id ? String(r.record_id) === id : true));
      } else if (s.includes("record_type = 'CANDIDATE'")) {
        const id = String(params[0] || "");
        list = list.filter(r => r.record_type === "CANDIDATE" && (id ? String(r.record_id) === id : true));
      } else if (params.length >= 2) {
        list = list.filter(r => r.record_type === params[0] && String(r.record_id) === String(params[1]));
      }
      return [...list].sort((a, b) => b.id - a.id);
    }

    // 9. Employer Requirements (all/filtered):
    if (s.includes("FROM employer_requirements")) {
      let list = [...this.tables.employer_requirements];
      if (params && params.length > 0) {
        let pIdx = 0;
        if (s.includes("status = ?") && pIdx < params.length) {
          const st = params[pIdx++];
          list = list.filter(r => r.status === st);
        }
        if (s.includes("job_location) LIKE ?") && pIdx < params.length) {
          const loc = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r => String(r.job_location || "").toLowerCase().includes(loc));
        }
        if (s.includes("department) LIKE ?") && pIdx < params.length) {
          const dep = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r => String(r.department || "").toLowerCase().includes(dep));
        }
        if (s.includes("job_title) LIKE ?") && pIdx < params.length) {
          const jt = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r => String(r.job_title || "").toLowerCase().includes(jt));
        }
        if (s.includes("contact_name) LIKE ?") && pIdx < params.length) {
          const search = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r =>
            String(r.contact_name || "").toLowerCase().includes(search) ||
            String(r.mobile || "").includes(search) ||
            String(r.job_title || "").toLowerCase().includes(search) ||
            String(r.requirement_id || "").toLowerCase().includes(search)
          );
        }
      }
      if (s.includes("ORDER BY id DESC")) {
        list.sort((a, b) => (b.id || 0) - (a.id || 0));
      } else {
        list.sort((a, b) => (a.id || 0) - (b.id || 0));
      }
      return list;
    }

    // 10. Employee Candidates (all/filtered):
    if (s.includes("FROM employee_candidates")) {
      let list = [...this.tables.employee_candidates];
      if (params && params.length > 0) {
        let pIdx = 0;
        if (s.includes("status = ?") && pIdx < params.length) {
          const st = params[pIdx++];
          list = list.filter(r => r.status === st);
        }
        if (s.includes("qualification) LIKE ?") && pIdx < params.length) {
          const q = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r => String(r.qualification || "").toLowerCase().includes(q));
        }
        if (s.includes("current_location) LIKE ?") && pIdx < params.length) {
          const loc = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r => String(r.current_location || "").toLowerCase().includes(loc));
        }
        if (s.includes("skills) LIKE ?") && pIdx < params.length) {
          const sk = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r => String(r.skills || "").toLowerCase().includes(sk));
        }
        if (s.includes("full_name) LIKE ?") && pIdx < params.length) {
          const search = String(params[pIdx++]).replace(/%/g, "").toLowerCase();
          list = list.filter(r =>
            String(r.full_name || "").toLowerCase().includes(search) ||
            String(r.mobile || "").includes(search) ||
            String(r.email || "").toLowerCase().includes(search) ||
            String(r.candidate_id || "").toLowerCase().includes(search)
          );
        }
      }
      if (s.includes("ORDER BY id DESC")) {
        list.sort((a, b) => (b.id || 0) - (a.id || 0));
      } else {
        list.sort((a, b) => (a.id || 0) - (b.id || 0));
      }
      return list;
    }

    return [];
  }

  run(sql: string, params: any[] = []): void {
    const s = sql.trim();

    // 1. admin_sessions
    if (s.startsWith("INSERT INTO admin_sessions")) {
      const [token, username, created_at, expires_at] = params;
      this.tables.admin_sessions = this.tables.admin_sessions.filter(r => r.token !== token);
      this.tables.admin_sessions.push({ token, username, created_at, expires_at });
    } else if (s.startsWith("DELETE FROM admin_sessions WHERE token = ?")) {
      const token = params[0];
      this.tables.admin_sessions = this.tables.admin_sessions.filter(r => r.token !== token);
    }

    // 2. otp_sessions
    else if (s.startsWith("INSERT INTO otp_sessions")) {
      const [mobile, otp, expires_at, last_sent_at] = params;
      const existing = this.tables.otp_sessions.find(r => String(r.mobile) === String(mobile));
      if (existing) {
        existing.otp = otp;
        existing.attempts = 0;
        existing.expires_at = expires_at;
        existing.last_sent_at = last_sent_at;
        existing.verified_token = null;
        existing.token_expires_at = null;
      } else {
        this.tables.otp_sessions.push({
          mobile: String(mobile),
          otp,
          attempts: 0,
          expires_at,
          last_sent_at,
          verified_token: null,
          token_expires_at: null
        });
      }
    } else if (s.includes("UPDATE otp_sessions SET attempts = ? WHERE mobile = ?")) {
      const [attempts, mobile] = params;
      const row = this.tables.otp_sessions.find(r => String(r.mobile) === String(mobile));
      if (row) row.attempts = attempts;
    } else if (s.includes("UPDATE otp_sessions SET verified_token = ?, token_expires_at = ? WHERE mobile = ?")) {
      const [verified_token, token_expires_at, mobile] = params;
      const row = this.tables.otp_sessions.find(r => String(r.mobile) === String(mobile));
      if (row) {
        row.verified_token = verified_token;
        row.token_expires_at = token_expires_at;
      }
    }

    // 3. employer_requirements
    else if (s.startsWith("INSERT INTO employer_requirements")) {
      const maxId = this.tables.employer_requirements.reduce((max, r) => Math.max(max, r.id || 0), 0);
      const newId = maxId + 1;
      const [
        requirement_id, contact_name, mobile, job_title, department, position_name,
        job_location, qualification, experience_required, skills, job_description,
        salary_range, hiring_deadline, status, submitted_at, status_updated_at
      ] = params;

      this.tables.employer_requirements.push({
        id: newId,
        requirement_id,
        contact_name,
        mobile,
        job_title,
        department,
        position_name,
        job_location,
        qualification,
        experience_required,
        skills,
        job_description,
        salary_range,
        hiring_deadline,
        status,
        submitted_at: submitted_at || new Date().toISOString(),
        status_updated_at: status_updated_at || new Date().toISOString(),
      });
    } else if (s.startsWith("UPDATE employer_requirements SET")) {
      const searchKey = String(params[params.length - 1] || "");
      const item = this.tables.employer_requirements.find(
        r => String(r.requirement_id).toUpperCase() === searchKey.toUpperCase() || String(r.id) === searchKey
      );
      if (item && params.length >= 11) {
        const [
          status, status_updated_at, admin_notes, interview_date, interview_time,
          interview_mode, interview_remarks, offer_date, placement_date,
          annual_package, days_to_placement
        ] = params;
        if (status !== undefined) item.status = status;
        if (status_updated_at !== undefined) item.status_updated_at = status_updated_at;
        if (admin_notes !== undefined) item.admin_notes = admin_notes;
        if (interview_date !== undefined) item.interview_date = interview_date;
        if (interview_time !== undefined) item.interview_time = interview_time;
        if (interview_mode !== undefined) item.interview_mode = interview_mode;
        if (interview_remarks !== undefined) item.interview_remarks = interview_remarks;
        if (offer_date !== undefined) item.offer_date = offer_date;
        if (placement_date !== undefined) item.placement_date = placement_date;
        if (annual_package !== undefined) item.annual_package = annual_package ? Number(annual_package) : null;
        if (days_to_placement !== undefined) item.days_to_placement = days_to_placement ? Number(days_to_placement) : null;
      }
    }

    // 4. employee_candidates
    else if (s.startsWith("INSERT INTO employee_candidates")) {
      const maxId = this.tables.employee_candidates.reduce((max, r) => Math.max(max, r.id || 0), 0);
      const newId = maxId + 1;
      const [
        candidate_id, full_name, mobile, email, current_location, qualification,
        total_experience, current_ctc, expected_ctc, skills, immediate_joiner,
        status, applied_at, status_updated_at
      ] = params;

      this.tables.employee_candidates.push({
        id: newId,
        candidate_id,
        full_name,
        mobile,
        email,
        current_location,
        qualification,
        total_experience,
        current_ctc,
        expected_ctc,
        skills,
        immediate_joiner,
        status,
        applied_at: applied_at || new Date().toISOString(),
        status_updated_at: status_updated_at || new Date().toISOString(),
      });
    } else if (s.startsWith("UPDATE employee_candidates SET")) {
      const searchKey = String(params[params.length - 1] || "");
      const item = this.tables.employee_candidates.find(
        r => String(r.candidate_id).toUpperCase() === searchKey.toUpperCase() || String(r.id) === searchKey
      );
      if (item && params.length >= 10) {
        const [
          status, status_updated_at, admin_notes, interview_date, interview_time,
          interview_mode, interview_remarks, offer_date, hired_date,
          annual_package
        ] = params;
        if (status !== undefined) item.status = status;
        if (status_updated_at !== undefined) item.status_updated_at = status_updated_at;
        if (admin_notes !== undefined) item.admin_notes = admin_notes;
        if (interview_date !== undefined) item.interview_date = interview_date;
        if (interview_time !== undefined) item.interview_time = interview_time;
        if (interview_mode !== undefined) item.interview_mode = interview_mode;
        if (interview_remarks !== undefined) item.interview_remarks = interview_remarks;
        if (offer_date !== undefined) item.offer_date = offer_date;
        if (hired_date !== undefined) item.hired_date = hired_date;
        if (annual_package !== undefined) item.annual_package = annual_package ? Number(annual_package) : null;
      }
    }

    // 4B. DELETE operations
    else if (s.startsWith("DELETE FROM employer_requirements")) {
      const searchKey = String(params[0] || "");
      this.tables.employer_requirements = this.tables.employer_requirements.filter(
        r => String(r.requirement_id).toUpperCase() !== searchKey.toUpperCase() && String(r.id) !== searchKey
      );
      this.tables.status_history = this.tables.status_history.filter(
        h => String(h.record_id).toUpperCase() !== searchKey.toUpperCase()
      );
    } else if (s.startsWith("DELETE FROM employee_candidates")) {
      const searchKey = String(params[0] || "");
      this.tables.employee_candidates = this.tables.employee_candidates.filter(
        r => String(r.candidate_id).toUpperCase() !== searchKey.toUpperCase() && String(r.id) !== searchKey
      );
      this.tables.status_history = this.tables.status_history.filter(
        h => String(h.record_id).toUpperCase() !== searchKey.toUpperCase()
      );
    }

    // 5. status_history
    else if (s.startsWith("INSERT INTO status_history")) {
      const maxId = this.tables.status_history.reduce((max, r) => Math.max(max, r.id || 0), 0);
      const newId = maxId + 1;
      if (params.length >= 7) {
        const [record_type, record_id, previous_status, new_status, changed_by, changed_at, remarks] = params;
        this.tables.status_history.push({
          id: newId,
          record_type,
          record_id,
          previous_status,
          new_status,
          changed_by,
          changed_at: changed_at || new Date().toISOString(),
          remarks
        });
      } else if (params.length === 6) {
        const [record_type, record_id, new_status, changed_by, changed_at, remarks] = params;
        this.tables.status_history.push({
          id: newId,
          record_type,
          record_id,
          previous_status: null,
          new_status,
          changed_by,
          changed_at: changed_at || new Date().toISOString(),
          remarks
        });
      }
    }

    // Replicate writes to Supabase PostgreSQL in background
    syncWriteToSupabase(sql, params).catch(err => {
      console.error("Background sync to Supabase failed:", err.message);
    });
  }

  exec(_sql: string): any {
    return [{ columns: [], values: [] }];
  }

  export(): Uint8Array {
    return new Uint8Array();
  }
}

let dbPromise: Promise<PureDatabase> | null = null;
let lastSupabaseSync = new Date().toISOString();

/**
 * Initialize and get the database.
 * Pure JavaScript, 100% WASM-free, synchronized with Supabase PostgreSQL.
 */
export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = new PureDatabase();
      // Initialize and synchronize with Supabase PostgreSQL
      try {
        await initSupabasePostgres();
        await syncFromSupabaseToLocal(db);
        console.log("SSKJOBS.IN connected to Supabase PostgreSQL cloud database successfully (Pure JS engine).");
      } catch (err: any) {
        console.warn("Supabase initial sync warning (falling back to initial seed data):", err.message);
        seedInitialDataIfEmpty(db);
      }
      return db;
    })();
  }
  return await dbPromise;
}

export function saveDb(): void {
  // Persistence is handled automatically in Supabase PostgreSQL
}

/**
 * Ensures required tables exist in Supabase PostgreSQL
 */
async function initSupabasePostgres(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS employer_requirements (
        id SERIAL PRIMARY KEY,
        requirement_id VARCHAR(50) UNIQUE NOT NULL,
        business_name VARCHAR(255),
        company_website VARCHAR(255),
        email VARCHAR(255),
        contact_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        position_name VARCHAR(255) NOT NULL,
        job_location VARCHAR(255) NOT NULL,
        qualification VARCHAR(255) NOT NULL,
        experience_required VARCHAR(100) NOT NULL,
        skills TEXT NOT NULL,
        job_description TEXT NOT NULL,
        salary_range VARCHAR(100) NOT NULL,
        hiring_deadline VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        interview_date VARCHAR(50),
        interview_time VARCHAR(50),
        interview_mode VARCHAR(50),
        interview_remarks TEXT,
        offer_date VARCHAR(50),
        placement_date VARCHAR(50),
        annual_package NUMERIC,
        admin_notes TEXT,
        days_to_placement INTEGER
      );

      CREATE TABLE IF NOT EXISTS employee_candidates (
        id SERIAL PRIMARY KEY,
        candidate_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        current_location VARCHAR(255) NOT NULL,
        qualification VARCHAR(255) NOT NULL,
        total_experience VARCHAR(100) NOT NULL,
        current_ctc VARCHAR(100),
        expected_ctc VARCHAR(100) NOT NULL,
        skills TEXT NOT NULL,
        immediate_joiner SMALLINT NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        interview_date VARCHAR(50),
        interview_time VARCHAR(50),
        interview_mode VARCHAR(50),
        interview_remarks TEXT,
        offer_date VARCHAR(50),
        hired_date VARCHAR(50),
        annual_package NUMERIC,
        admin_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS status_history (
        id SERIAL PRIMARY KEY,
        record_type VARCHAR(20) NOT NULL,
        record_id VARCHAR(50) NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by VARCHAR(100) NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        remarks TEXT
      );

      CREATE TABLE IF NOT EXISTS otp_sessions (
        mobile VARCHAR(20) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        attempts INTEGER DEFAULT 0,
        expires_at BIGINT NOT NULL,
        last_sent_at BIGINT NOT NULL,
        verified_token VARCHAR(255),
        token_expires_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        token VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT,
        password_hash VARCHAR(255),
        full_name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );

      -- Ensure user_id and foreign key columns exist
      ALTER TABLE public.employer_requirements 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS company_website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255);

      ALTER TABLE public.employee_candidates 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

      ALTER TABLE public.status_history 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS employer_id INTEGER REFERENCES public.employer_requirements(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS candidate_id INTEGER REFERENCES public.employee_candidates(id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_emp_mobile ON employer_requirements(mobile);
      CREATE INDEX IF NOT EXISTS idx_emp_business_name ON employer_requirements(business_name);
      CREATE INDEX IF NOT EXISTS idx_cand_mobile ON employee_candidates(mobile);
      CREATE INDEX IF NOT EXISTS idx_status_history_rec ON status_history(record_id);
      CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);
      CREATE INDEX IF NOT EXISTS idx_emp_user_id ON employer_requirements(user_id);
      CREATE INDEX IF NOT EXISTS idx_cand_user_id ON employee_candidates(user_id);
      CREATE INDEX IF NOT EXISTS idx_status_hist_user_id ON status_history(user_id);
    `);
  } finally {
    client.release();
  }
}

/**
 * Loads records from Supabase PostgreSQL into memory
 */
export async function syncFromSupabaseToLocal(db: Database): Promise<void> {
  const pureDb = db as PureDatabase;
  const client = await pgPool.connect();
  try {
    const emps = await client.query("SELECT * FROM employer_requirements ORDER BY id ASC");
    const cands = await client.query("SELECT * FROM employee_candidates ORDER BY id ASC");
    const history = await client.query("SELECT * FROM status_history ORDER BY id ASC");
    const otpRows = await client.query("SELECT * FROM otp_sessions");
    const adminRows = await client.query("SELECT * FROM admin_sessions");

    pureDb.tables.employer_requirements = emps.rows.map(emp => ({
      ...emp,
      id: Number(emp.id),
      user_id: emp.user_id || null,
      submitted_at: emp.submitted_at instanceof Date ? emp.submitted_at.toISOString() : String(emp.submitted_at || ""),
      status_updated_at: emp.status_updated_at instanceof Date ? emp.status_updated_at.toISOString() : String(emp.status_updated_at || ""),
      annual_package: emp.annual_package ? Number(emp.annual_package) : null,
      days_to_placement: emp.days_to_placement ? Number(emp.days_to_placement) : null,
    }));

    pureDb.tables.employee_candidates = cands.rows.map(cand => ({
      ...cand,
      id: Number(cand.id),
      user_id: cand.user_id || null,
      immediate_joiner: Number(cand.immediate_joiner || 1),
      applied_at: cand.applied_at instanceof Date ? cand.applied_at.toISOString() : String(cand.applied_at || ""),
      status_updated_at: cand.status_updated_at instanceof Date ? cand.status_updated_at.toISOString() : String(cand.status_updated_at || ""),
      annual_package: cand.annual_package ? Number(cand.annual_package) : null,
    }));

    pureDb.tables.status_history = history.rows.map(h => ({
      ...h,
      id: Number(h.id),
      employer_id: h.employer_id ? Number(h.employer_id) : null,
      candidate_id: h.candidate_id ? Number(h.candidate_id) : null,
      user_id: h.user_id || null,
      changed_at: h.changed_at instanceof Date ? h.changed_at.toISOString() : String(h.changed_at || "")
    }));

    pureDb.tables.otp_sessions = otpRows.rows.map(o => ({
      ...o,
      attempts: Number(o.attempts || 0),
      expires_at: Number(o.expires_at || 0),
      last_sent_at: Number(o.last_sent_at || 0),
      token_expires_at: o.token_expires_at ? Number(o.token_expires_at) : null
    }));

    pureDb.tables.admin_sessions = adminRows.rows.map(a => ({
      ...a,
      created_at: Number(a.created_at || 0),
      expires_at: Number(a.expires_at || 0)
    }));

    lastSupabaseSync = new Date().toISOString();
  } finally {
    client.release();
  }
}

/**
 * Direct, verified database write functions that execute against Supabase PostgreSQL
 * and keep the local state in sync. Throws if Supabase rejects the write.
 */
export async function insertEmployerRequirementDirect(data: {
  requirement_id: string;
  user_id?: string | null;
  business_name: string;
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
  status: string;
  admin_notes?: string | null;
}): Promise<EmployerRequirement> {
  const client = await pgPool.connect();
  try {
    const res = await client.query(
      `INSERT INTO employer_requirements (
        requirement_id, user_id, business_name, company_website, email, contact_name, mobile, job_title, department, position_name,
        job_location, qualification, experience_required, skills, job_description,
        salary_range, hiring_deadline, status, submitted_at, status_updated_at, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW(), $19)
      RETURNING *`,
      [
        data.requirement_id,
        data.user_id || null,
        data.business_name,
        data.company_website || null,
        data.email || null,
        data.contact_name,
        data.mobile,
        data.job_title,
        data.department,
        data.position_name,
        data.job_location,
        data.qualification,
        data.experience_required,
        data.skills,
        data.job_description,
        data.salary_range,
        data.hiring_deadline,
        data.status || "Submitted",
        data.admin_notes || null,
      ]
    );

    const inserted = res.rows[0];

    // Initial status history in Supabase
    await client.query(
      `INSERT INTO status_history (
        record_type, record_id, employer_id, user_id, previous_status, new_status, changed_by, changed_at, remarks
      ) VALUES ($1, $2, $3, $4, NULL, $5, $6, NOW(), $7)`,
      [
        "EMPLOYER",
        inserted.requirement_id,
        inserted.id,
        inserted.user_id || null,
        inserted.status,
        "Public Form Submission",
        "Requirement submitted by employer",
      ]
    );

    // Update in-memory pureDb
    const db = await getDb();
    const pure = db as PureDatabase;
    pure.tables.employer_requirements.unshift({
      ...inserted,
      id: Number(inserted.id),
      annual_package: inserted.annual_package ? Number(inserted.annual_package) : null,
      days_to_placement: inserted.days_to_placement ? Number(inserted.days_to_placement) : null,
      submitted_at: inserted.submitted_at instanceof Date ? inserted.submitted_at.toISOString() : String(inserted.submitted_at),
      status_updated_at: inserted.status_updated_at instanceof Date ? inserted.status_updated_at.toISOString() : String(inserted.status_updated_at),
    });
    pure.tables.status_history.unshift({
      id: Date.now(),
      record_type: "EMPLOYER",
      record_id: inserted.requirement_id,
      employer_id: Number(inserted.id),
      candidate_id: null,
      user_id: inserted.user_id,
      previous_status: null,
      new_status: inserted.status,
      changed_by: "Public Form Submission",
      changed_at: new Date().toISOString(),
      remarks: "Requirement submitted by employer",
    });

    return inserted;
  } finally {
    client.release();
  }
}

export async function insertCandidateDirect(data: {
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
  status: string;
  user_id?: string | null;
  admin_notes?: string | null;
}): Promise<EmployeeCandidate> {
  const client = await pgPool.connect();
  try {
    const res = await client.query(
      `INSERT INTO employee_candidates (
        candidate_id, user_id, full_name, mobile, email, current_location, qualification,
        total_experience, current_ctc, expected_ctc, skills, immediate_joiner,
        status, applied_at, status_updated_at, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), $14)
      RETURNING *`,
      [
        data.candidate_id,
        data.user_id || null,
        data.full_name,
        data.mobile,
        data.email,
        data.current_location,
        data.qualification,
        data.total_experience,
        data.current_ctc || null,
        data.expected_ctc,
        data.skills,
        data.immediate_joiner ? 1 : 0,
        data.status || "Applied",
        data.admin_notes || null,
      ]
    );

    const inserted = res.rows[0];

    // Initial status history in Supabase
    await client.query(
      `INSERT INTO status_history (
        record_type, record_id, candidate_id, user_id, previous_status, new_status, changed_by, changed_at, remarks
      ) VALUES ($1, $2, $3, $4, NULL, $5, $6, NOW(), $7)`,
      [
        "CANDIDATE",
        inserted.candidate_id,
        inserted.id,
        inserted.user_id || null,
        inserted.status,
        "Public Form Registration",
        "Candidate career profile registered",
      ]
    );

    // Update in-memory pureDb
    const db = await getDb();
    const pure = db as PureDatabase;
    pure.tables.employee_candidates.unshift({
      ...inserted,
      id: Number(inserted.id),
      immediate_joiner: Number(inserted.immediate_joiner || 1),
      annual_package: inserted.annual_package ? Number(inserted.annual_package) : null,
      applied_at: inserted.applied_at instanceof Date ? inserted.applied_at.toISOString() : String(inserted.applied_at),
      status_updated_at: inserted.status_updated_at instanceof Date ? inserted.status_updated_at.toISOString() : String(inserted.status_updated_at),
    });
    pure.tables.status_history.unshift({
      id: Date.now(),
      record_type: "CANDIDATE",
      record_id: inserted.candidate_id,
      employer_id: null,
      candidate_id: Number(inserted.id),
      user_id: inserted.user_id,
      previous_status: null,
      new_status: inserted.status,
      changed_by: "Public Form Registration",
      changed_at: new Date().toISOString(),
      remarks: "Candidate career profile registered",
    });

    return inserted;
  } finally {
    client.release();
  }
}

export async function updateEmployerRequirementDirect(
  requirementId: string,
  updates: {
    status?: string;
    admin_notes?: string | null;
    interview_date?: string | null;
    interview_time?: string | null;
    interview_mode?: string | null;
    interview_remarks?: string | null;
    offer_date?: string | null;
    placement_date?: string | null;
    annual_package?: number | null;
    days_to_placement?: number | null;
    business_name?: string | null;
    company_website?: string | null;
    email?: string | null;
  },
  remarks?: string,
  changedBy: string = "Admin",
  userId?: string | null
): Promise<EmployerRequirement> {
  const client = await pgPool.connect();
  try {
    const sel = await client.query("SELECT * FROM employer_requirements WHERE requirement_id = $1", [requirementId]);
    if (sel.rows.length === 0) {
      throw new Error(`Employer requirement "${requirementId}" not found in database.`);
    }
    const current = sel.rows[0];
    const prevStatus = current.status;
    const newStatus = updates.status || prevStatus;

    const res = await client.query(
      `UPDATE employer_requirements SET
        status = $1,
        status_updated_at = NOW(),
        admin_notes = COALESCE($2, admin_notes),
        interview_date = COALESCE($3, interview_date),
        interview_time = COALESCE($4, interview_time),
        interview_mode = COALESCE($5, interview_mode),
        interview_remarks = COALESCE($6, interview_remarks),
        offer_date = COALESCE($7, offer_date),
        placement_date = COALESCE($8, placement_date),
        annual_package = COALESCE($9, annual_package),
        days_to_placement = COALESCE($10, days_to_placement),
        business_name = COALESCE($11, business_name),
        company_website = COALESCE($12, company_website),
        email = COALESCE($13, email)
      WHERE requirement_id = $14
      RETURNING *`,
      [
        newStatus,
        updates.admin_notes !== undefined ? updates.admin_notes : null,
        updates.interview_date !== undefined ? updates.interview_date : null,
        updates.interview_time !== undefined ? updates.interview_time : null,
        updates.interview_mode !== undefined ? updates.interview_mode : null,
        updates.interview_remarks !== undefined ? updates.interview_remarks : null,
        updates.offer_date !== undefined ? updates.offer_date : null,
        updates.placement_date !== undefined ? updates.placement_date : null,
        updates.annual_package !== undefined && updates.annual_package !== null && updates.annual_package !== ("" as any)
          ? Number(updates.annual_package)
          : null,
        updates.days_to_placement !== undefined ? updates.days_to_placement : null,
        updates.business_name !== undefined ? updates.business_name : null,
        updates.company_website !== undefined ? updates.company_website : null,
        updates.email !== undefined ? updates.email : null,
        requirementId,
      ]
    );

    const updated = res.rows[0];

    if (newStatus !== prevStatus || remarks) {
      await client.query(
        `INSERT INTO status_history (
          record_type, record_id, employer_id, user_id, previous_status, new_status, changed_by, changed_at, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
        [
          "EMPLOYER",
          requirementId,
          updated.id,
          userId || updated.user_id || null,
          prevStatus,
          newStatus,
          changedBy,
          remarks || (updates.admin_notes ? `Updated by ${changedBy}: ${updates.admin_notes.slice(0, 60)}` : `Status updated to ${newStatus}`),
        ]
      );
    }

    // Refresh memory cache
    const db = await getDb();
    const pure = db as PureDatabase;
    const inMem = pure.tables.employer_requirements.find(r => r.requirement_id === requirementId);
    if (inMem) {
      Object.assign(inMem, {
        ...updated,
        id: Number(updated.id),
        annual_package: updated.annual_package ? Number(updated.annual_package) : null,
        days_to_placement: updated.days_to_placement ? Number(updated.days_to_placement) : null,
        status_updated_at: new Date().toISOString(),
      });
    }

    return updated;
  } finally {
    client.release();
  }
}

export async function updateCandidateDirect(
  candidateId: string,
  updates: {
    status?: string;
    admin_notes?: string | null;
    interview_date?: string | null;
    interview_time?: string | null;
    interview_mode?: string | null;
    interview_remarks?: string | null;
    offer_date?: string | null;
    hired_date?: string | null;
    annual_package?: number | null;
  },
  remarks?: string,
  changedBy: string = "Admin",
  userId?: string | null
): Promise<EmployeeCandidate> {
  const client = await pgPool.connect();
  try {
    const sel = await client.query("SELECT * FROM employee_candidates WHERE candidate_id = $1", [candidateId]);
    if (sel.rows.length === 0) {
      throw new Error(`Candidate "${candidateId}" not found in database.`);
    }
    const current = sel.rows[0];
    const prevStatus = current.status;
    const newStatus = updates.status || prevStatus;

    const res = await client.query(
      `UPDATE employee_candidates SET
        status = $1,
        status_updated_at = NOW(),
        admin_notes = COALESCE($2, admin_notes),
        interview_date = COALESCE($3, interview_date),
        interview_time = COALESCE($4, interview_time),
        interview_mode = COALESCE($5, interview_mode),
        interview_remarks = COALESCE($6, interview_remarks),
        offer_date = COALESCE($7, offer_date),
        hired_date = COALESCE($8, hired_date),
        annual_package = COALESCE($9, annual_package)
      WHERE candidate_id = $10
      RETURNING *`,
      [
        newStatus,
        updates.admin_notes !== undefined ? updates.admin_notes : null,
        updates.interview_date !== undefined ? updates.interview_date : null,
        updates.interview_time !== undefined ? updates.interview_time : null,
        updates.interview_mode !== undefined ? updates.interview_mode : null,
        updates.interview_remarks !== undefined ? updates.interview_remarks : null,
        updates.offer_date !== undefined ? updates.offer_date : null,
        updates.hired_date !== undefined ? updates.hired_date : null,
        updates.annual_package !== undefined && updates.annual_package !== null && updates.annual_package !== ("" as any)
          ? Number(updates.annual_package)
          : null,
        candidateId,
      ]
    );

    const updated = res.rows[0];

    if (newStatus !== prevStatus || remarks) {
      await client.query(
        `INSERT INTO status_history (
          record_type, record_id, candidate_id, user_id, previous_status, new_status, changed_by, changed_at, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
        [
          "CANDIDATE",
          candidateId,
          updated.id,
          userId || updated.user_id || null,
          prevStatus,
          newStatus,
          changedBy,
          remarks || (updates.admin_notes ? `Updated by ${changedBy}: ${updates.admin_notes.slice(0, 60)}` : `Status updated to ${newStatus}`),
        ]
      );
    }

    // Refresh memory cache
    const db = await getDb();
    const pure = db as PureDatabase;
    const inMem = pure.tables.employee_candidates.find(r => r.candidate_id === candidateId);
    if (inMem) {
      Object.assign(inMem, {
        ...updated,
        id: Number(updated.id),
        annual_package: updated.annual_package ? Number(updated.annual_package) : null,
        status_updated_at: new Date().toISOString(),
      });
    }

    return updated;
  } finally {
    client.release();
  }
}

export async function deleteEmployerRequirementDirect(requirementId: string): Promise<boolean> {
  const client = await pgPool.connect();
  try {
    await client.query("DELETE FROM status_history WHERE record_id = $1", [requirementId]);
    const res = await client.query("DELETE FROM employer_requirements WHERE requirement_id = $1 OR id::text = $1", [requirementId]);

    const db = await getDb();
    const pure = db as PureDatabase;
    pure.tables.employer_requirements = pure.tables.employer_requirements.filter(
      r => r.requirement_id !== requirementId && String(r.id) !== requirementId
    );
    pure.tables.status_history = pure.tables.status_history.filter(h => h.record_id !== requirementId);

    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function deleteCandidateDirect(candidateId: string): Promise<boolean> {
  const client = await pgPool.connect();
  try {
    await client.query("DELETE FROM status_history WHERE record_id = $1", [candidateId]);
    const res = await client.query("DELETE FROM employee_candidates WHERE candidate_id = $1 OR id::text = $1", [candidateId]);

    const db = await getDb();
    const pure = db as PureDatabase;
    pure.tables.employee_candidates = pure.tables.employee_candidates.filter(
      r => r.candidate_id !== candidateId && String(r.id) !== candidateId
    );
    pure.tables.status_history = pure.tables.status_history.filter(h => h.record_id !== candidateId);

    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

async function syncWriteToSupabase(sql: string, params?: any[]): Promise<void> {
  if (!pgPool) return;
  try {
    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    pgSql = pgSql.replace(/IFNULL/gi, "COALESCE");
    await pgPool.query(pgSql, params || []);
  } catch (err: any) {
    console.error("Supabase write sync error:", err.message, "SQL:", sql);
  }
}

/**
 * Returns connection and health status of Supabase
 */
export async function getSupabaseStatus(): Promise<{
  connected: boolean;
  projectUrl: string;
  host: string;
  database: string;
  latencyMs: number;
  tables: string[];
  counts: {
    employers: number;
    candidates: number;
    history: number;
  };
  lastSyncedAt: string;
}> {
  const start = Date.now();
  try {
    const client = await pgPool.connect();
    try {
      const empRes = await client.query("SELECT count(*) FROM employer_requirements");
      const candRes = await client.query("SELECT count(*) FROM employee_candidates");
      const histRes = await client.query("SELECT count(*) FROM status_history");
      const latencyMs = Date.now() - start;

      return {
        connected: true,
        projectUrl: SUPABASE_URL,
        host: process.env.POSTGRES_HOST || "db.yvmwueebtltbbgydkyzk.supabase.co",
        database: process.env.POSTGRES_DATABASE || "postgres",
        latencyMs,
        tables: [
          "employer_requirements",
          "employee_candidates",
          "status_history",
          "otp_sessions",
          "admin_sessions",
        ],
        counts: {
          employers: parseInt(empRes.rows[0].count, 10),
          candidates: parseInt(candRes.rows[0].count, 10),
          history: parseInt(histRes.rows[0].count, 10),
        },
        lastSyncedAt: lastSupabaseSync,
      };
    } finally {
      client.release();
    }
  } catch (_err: any) {
    return {
      connected: false,
      projectUrl: SUPABASE_URL,
      host: process.env.POSTGRES_HOST || "db.yvmwueebtltbbgydkyzk.supabase.co",
      database: process.env.POSTGRES_DATABASE || "postgres",
      latencyMs: Date.now() - start,
      tables: [],
      counts: { employers: 0, candidates: 0, history: 0 },
      lastSyncedAt: lastSupabaseSync,
    };
  }
}

function seedInitialDataIfEmpty(db: Database): void {
  const pureDb = db as PureDatabase;
  if (pureDb.tables.employer_requirements.length > 0) return;

  console.log("Seeding initial SSK community records into memory & Supabase...");

  pureDb.run(
    `INSERT INTO employer_requirements (
      requirement_id, contact_name, mobile, job_title, department, position_name,
      job_location, qualification, experience_required, skills, job_description,
      salary_range, hiring_deadline, status, submitted_at, status_updated_at,
      interview_date, interview_time, interview_mode, interview_remarks, offer_date,
      placement_date, annual_package, admin_notes, days_to_placement
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "EMP060",
      "Kavita S. Vernekar",
      "9845012345",
      "Voice & Data Entry Specialist",
      "Customer Support",
      "Voice & Data Entry Specialist",
      "Belagavi, Karnataka",
      "Any Graduate / PUC with Computer Skills",
      "1-3 Years",
      "English & Kannada Voice Support, MS Excel, Fast Typing",
      "Seeking committed SSK community professionals for customer coordination and back-office order processing.",
      "₹20,000 - ₹28,000 / month",
      "2026-10-31",
      "Sourcing",
      new Date().toISOString(),
      new Date().toISOString(),
      null, null, null, null, null, null, null,
      "Active requirement. Priority sourcing from Belagavi/Hubli community.",
      null
    ]
  );

  pureDb.run(
    `INSERT INTO employee_candidates (
      candidate_id, full_name, mobile, email, current_location, qualification,
      total_experience, current_ctc, expected_ctc, skills, immediate_joiner,
      status, applied_at, status_updated_at, interview_date, interview_time,
      interview_mode, interview_remarks, offer_date, hired_date, annual_package, admin_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "JOB075",
      "Prashant N. Kalburgi",
      "9739098765",
      "prashant.ssk@gmail.com",
      "Hubli, Karnataka",
      "B.Com / Tally Prime Certified",
      "3 Years",
      "₹2,40,000",
      "₹3,20,000",
      "GST Filing, Tally Prime, Accounts Payable, Banking, MS Excel",
      1,
      "Applied",
      new Date().toISOString(),
      new Date().toISOString(),
      null, null, null, null, null, null, null,
      "Profile verified by SSK Youth Coordination Cell."
    ]
  );

  pureDb.run(
    `INSERT INTO status_history (record_type, record_id, previous_status, new_status, changed_by, changed_at, remarks)
     VALUES (?, ?, NULL, ?, ?, ?, ?)`,
    ["EMPLOYER", "EMP060", "Sourcing", "System", new Date().toISOString(), "Employer requirement submitted"]
  );

  pureDb.run(
    `INSERT INTO status_history (record_type, record_id, previous_status, new_status, changed_by, changed_at, remarks)
     VALUES (?, ?, NULL, ?, ?, ?, ?)`,
    ["CANDIDATE", "JOB075", "Applied", "System", new Date().toISOString(), "Candidate career profile registered"]
  );
}
