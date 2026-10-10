import express from "express";
import type { Request, Response } from "express";
import crypto from "crypto";
import * as XLSX from "xlsx";
import {
  getDb,
  saveDb,
  type EmployerRequirement,
  type EmployeeCandidate,
  type StatusHistoryItem,
  getSupabaseStatus,
  syncFromSupabaseToLocal,
  pgPool,
  supabaseClient,
} from "./db.ts";
import { requestOtp, verifyOtp, validateUserSession } from "./otp.ts";

export const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "sskadmin2026";

// In-memory / DB session store for admin tokens
async function validateAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const now = Date.now();

  try {
    const db = await getDb();
    const stmt = db.prepare("SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?");
    stmt.bind([token, now]);
    const valid = stmt.step();
    stmt.free();
    if (valid) return true;
  } catch {}

  // Fallback to Supabase cloud admin_sessions
  try {
    const res = await pgPool.query(
      "SELECT token, username, expires_at FROM admin_sessions WHERE token = $1 AND expires_at > $2 LIMIT 1",
      [token, now]
    );
    if (res.rows.length > 0) {
      const db = await getDb();
      db.run("INSERT OR REPLACE INTO admin_sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)", [
        token,
        res.rows[0].username || "admin",
        now,
        Number(res.rows[0].expires_at || now + 12 * 60 * 60 * 1000),
      ]);
      return true;
    }
  } catch {}

  return false;
}

/**
 * Generate a unique random code for Employer Requirements (e.g. EMP001, EMP482)
 * or Job Seeker Career Profiles (e.g. JOB998, JOB142).
 * Fixed prefix with random unique digits.
 */
function generateUniqueRandomCode(db: any, prefix: "EMP" | "JOB"): string {
  const table = prefix === "EMP" ? "employer_requirements" : "employee_candidates";
  const col = prefix === "EMP" ? "requirement_id" : "candidate_id";

  // First pass: 3-digit random codes like EMP001, JOB998
  for (let attempt = 0; attempt < 500; attempt++) {
    const randVal = Math.floor(Math.random() * 999) + 1; // 1 to 999
    const candidateCode = `${prefix}${String(randVal).padStart(3, "0")}`;
    const checkStmt = db.prepare(`SELECT id FROM ${table} WHERE UPPER(${col}) = ?`);
    checkStmt.bind([candidateCode]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) {
      return candidateCode;
    }
  }

  // Second pass: if 3-digit namespace is saturated, use 4-digit random numbers
  for (let attempt = 0; attempt < 500; attempt++) {
    const randVal = Math.floor(Math.random() * 9000) + 1000;
    const candidateCode = `${prefix}${randVal}`;
    const checkStmt = db.prepare(`SELECT id FROM ${table} WHERE UPPER(${col}) = ?`);
    checkStmt.bind([candidateCode]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) {
      return candidateCode;
    }
  }

  return `${prefix}${Math.floor(Math.random() * 900000) + 100000}`;
}

// -------------------------------------------------------------
// 1. PUBLIC COMMUNITY IMPACT METRICS (Calculated dynamically)
// -------------------------------------------------------------
router.get("/public/impact-stats", async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    // Candidates count
    const candStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_candidates,
        SUM(CASE WHEN status = 'Interview Scheduled' THEN 1 ELSE 0 END) as candidate_interviews,
        SUM(CASE WHEN status = 'Offer Letter' THEN 1 ELSE 0 END) as candidate_offers,
        SUM(CASE WHEN status = 'Hired' THEN 1 ELSE 0 END) as candidate_hired,
        SUM(CASE WHEN status = 'Hired' THEN IFNULL(annual_package, 0) ELSE 0 END) as candidate_package_sum
      FROM employee_candidates
    `);
    candStmt.step();
    const candStats = candStmt.getAsObject();
    candStmt.free();

    // Employer Requirements count
    const empStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_requirements,
        SUM(CASE WHEN status = 'Sourcing' THEN 1 ELSE 0 END) as employer_sourcing,
        SUM(CASE WHEN status = 'Interview Scheduled' THEN 1 ELSE 0 END) as employer_interviews,
        SUM(CASE WHEN status = 'Offer Letter' THEN 1 ELSE 0 END) as employer_offers,
        SUM(CASE WHEN status = 'Placement Successful' THEN 1 ELSE 0 END) as employer_placements,
        AVG(days_to_placement) as avg_days_to_placement,
        SUM(CASE WHEN status = 'Placement Successful' THEN IFNULL(annual_package, 0) ELSE 0 END) as employer_package_sum
      FROM employer_requirements
    `);
    empStmt.step();
    const empStats = empStmt.getAsObject();
    empStmt.free();

    const totalApplications = Number(candStats.total_candidates || 0);
    const totalInterviews = Number(candStats.candidate_interviews || 0) + Number(empStats.employer_interviews || 0);
    const totalOffers = Number(candStats.candidate_offers || 0) + Number(empStats.employer_offers || 0);
    const totalPlaced = Math.max(Number(candStats.candidate_hired || 0), Number(empStats.employer_placements || 0));
    const totalAnnualPackage = Math.max(Number(candStats.candidate_package_sum || 0), Number(empStats.employer_package_sum || 0));

    res.json({
      success: true,
      data: {
        applicationsReceived: totalApplications,
        interviewsScheduled: totalInterviews,
        offerLetters: totalOffers,
        professionalsPlaced: totalPlaced,
        annualPackageGenerated: totalAnnualPackage,
        // Detailed metrics
        employerMetrics: {
          totalRequirements: Number(empStats.total_requirements || 0),
          sourcingCount: Number(empStats.employer_sourcing || 0),
          interviewsScheduled: Number(empStats.employer_interviews || 0),
          offerLetters: Number(empStats.employer_offers || 0),
          successfulPlacements: Number(empStats.employer_placements || 0),
          averageDaysToPlacement: empStats.avg_days_to_placement ? Math.round(Number(empStats.avg_days_to_placement)) : 15,
          totalAnnualPackage: Number(empStats.employer_package_sum || 0),
        },
        employeeMetrics: {
          totalApplications,
          interviewsScheduled: Number(candStats.candidate_interviews || 0),
          offerLetters: Number(candStats.candidate_offers || 0),
          totalHired: Number(candStats.candidate_hired || 0),
          totalAnnualPackage: Number(candStats.candidate_package_sum || 0),
        },
      },
    });
  } catch (err: any) {
    console.error("Error computing impact stats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

async function getStatusById(cleanId: string) {
    const db = await getDb();

    // 1. Check Employer Requirements
    const empStmt = db.prepare(`
      SELECT 
        id, requirement_id, contact_name, mobile, job_title, department, position_name,
        job_location, qualification, experience_required, skills, job_description,
        salary_range, hiring_deadline, status, submitted_at, status_updated_at,
        interview_date, interview_time, interview_mode, interview_remarks, offer_date, placement_date
      FROM employer_requirements 
      WHERE UPPER(requirement_id) = ?
    `);
    empStmt.bind([cleanId]);
    const empFound = empStmt.step();
    let empRecord: any = null;
    if (empFound) {
      empRecord = empStmt.getAsObject();
    }
    empStmt.free();

    if (empRecord) {
      // Fetch status timeline
      const histStmt = db.prepare(`
        SELECT previous_status, new_status, changed_at, remarks
        FROM status_history
        WHERE record_type = 'EMPLOYER' AND record_id = ?
        ORDER BY id ASC
      `);
      histStmt.bind([empRecord.requirement_id]);
      const timeline: any[] = [];
      while (histStmt.step()) {
        timeline.push(histStmt.getAsObject());
      }
      histStmt.free();
      empRecord.timeline = timeline;

      return {
        success: true,
        type: "employer",
        record: empRecord,
      };
    }

    // 2. Check Candidate Applications
    const candStmt = db.prepare(`
      SELECT 
        id, candidate_id, full_name, mobile, email, current_location, qualification,
        total_experience, current_ctc, expected_ctc, skills, immediate_joiner,
        status, applied_at, status_updated_at, interview_date, interview_time,
        interview_mode, interview_remarks, offer_date, hired_date
      FROM employee_candidates 
      WHERE UPPER(candidate_id) = ?
    `);
    candStmt.bind([cleanId]);
    const candFound = candStmt.step();
    let candRecord: any = null;
    if (candFound) {
      candRecord = candStmt.getAsObject();
    }
    candStmt.free();

    if (candRecord) {
      // Fetch status timeline
      const histStmt = db.prepare(`
        SELECT previous_status, new_status, changed_at, remarks
        FROM status_history
        WHERE record_type = 'CANDIDATE' AND record_id = ?
        ORDER BY id ASC
      `);
      histStmt.bind([candRecord.candidate_id]);
      const timeline: any[] = [];
      while (histStmt.step()) {
        timeline.push(histStmt.getAsObject());
      }
      histStmt.free();
      candRecord.timeline = timeline;

      return {
        success: true,
        type: "candidate",
        record: candRecord,
      };
    }
    
    return {
      success: false,
      message: `No record found with ID "${cleanId}". Please check your Requirement ID (e.g. EMP001) or Application ID (e.g. JOB998) and try again.`,
    };
}

// -------------------------------------------------------------
// 1B. PUBLIC ACTIVE COMMUNITY JOB OPENINGS (For Home Page Board)
// -------------------------------------------------------------
router.get("/public/jobs", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const query = `
      SELECT 
        id, requirement_id, job_title, department, position_name,
        job_location, qualification, experience_required, skills,
        job_description, salary_range, status, submitted_at
      FROM employer_requirements
      ORDER BY id DESC
      LIMIT 20
    `;
    const stmt = db.prepare(query);
    const jobs: any[] = [];
    while (stmt.step()) {
      jobs.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({
      success: true,
      jobs,
    });
  } catch (err: any) {
    console.error("Error fetching public jobs:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. EMPLOYER REGISTRATION WORKFLOW
// -------------------------------------------------------------
router.post("/employer/register", async (req: Request, res: Response) => {
  try {
    const {
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
      allow_continue,
    } = req.body;

    // Validation
    if (
      !contact_name ||
      !mobile ||
      !job_title ||
      !department ||
      !position_name ||
      !job_location ||
      !qualification ||
      !experience_required ||
      !skills ||
      !job_description ||
      !salary_range ||
      !hiring_deadline
    ) {
      return res.status(400).json({
        success: false,
        message: "All required employer information and job details must be provided.",
      });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number.",
      });
    }

    const db = await getDb();

    // Duplicate check
    if (!allow_continue) {
      const dupStmt = db.prepare("SELECT requirement_id, status FROM employer_requirements WHERE mobile = ?");
      dupStmt.bind([cleanMobile]);
      const hasDuplicate = dupStmt.step();
      let existingRecord = null;
      if (hasDuplicate) {
        existingRecord = dupStmt.getAsObject();
      }
      dupStmt.free();

      if (hasDuplicate) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: "A profile associated with this mobile number already exists.",
          existingRecord,
        });
      }
    }

    // Generate unique random Requirement ID (e.g. EMP001, EMP482)
    const requirementId = generateUniqueRandomCode(db, "EMP");

    const nowIso = new Date().toISOString();
    const initialStatus = "Submitted";

    db.run(
      `INSERT INTO employer_requirements (
        requirement_id, contact_name, mobile, job_title, department, position_name,
        job_location, qualification, experience_required, skills, job_description,
        salary_range, hiring_deadline, status, submitted_at, status_updated_at,
        admin_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        requirementId,
        contact_name.trim(),
        cleanMobile,
        job_title.trim(),
        department.trim(),
        position_name.trim(),
        job_location.trim(),
        qualification.trim(),
        experience_required.trim(),
        skills.trim(),
        job_description.trim(),
        salary_range.trim(),
        hiring_deadline.trim(),
        initialStatus,
        nowIso,
        nowIso,
      ]
    );

    // Record initial status history
    db.run(
      `INSERT INTO status_history (record_type, record_id, previous_status, new_status, changed_by, changed_at, remarks)
       VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      ["EMPLOYER", requirementId, initialStatus, "Public Form Submission", nowIso, "Requirement submitted by employer"]
    );

    saveDb();

    res.json({
      success: true,
      requirementId,
      status: initialStatus,
      message: "Requirement Submitted Successfully! Your requirement has been received by SSK JOB.",
    });
  } catch (err: any) {
    console.error("Employer register error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. JOB SEEKER REGISTRATION WORKFLOW
// -------------------------------------------------------------
router.post("/candidate/register", async (req: Request, res: Response) => {
  try {
    const {
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
      allow_continue,
    } = req.body;

    if (
      !full_name ||
      !mobile ||
      !email ||
      !current_location ||
      !qualification ||
      !total_experience ||
      !expected_ctc ||
      !skills ||
      immediate_joiner === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all mandatory personal and professional fields.",
      });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const db = await getDb();

    // Duplicate check
    if (!allow_continue) {
      const dupStmt = db.prepare("SELECT candidate_id, status FROM employee_candidates WHERE mobile = ?");
      dupStmt.bind([cleanMobile]);
      const hasDuplicate = dupStmt.step();
      let existingRecord = null;
      if (hasDuplicate) {
        existingRecord = dupStmt.getAsObject();
      }
      dupStmt.free();

      if (hasDuplicate) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: "A profile associated with this mobile number already exists.",
          existingRecord,
        });
      }
    }

    // Generate unique random Candidate ID (e.g. JOB998, JOB142)
    const candidateId = generateUniqueRandomCode(db, "JOB");

    const nowIso = new Date().toISOString();
    const initialStatus = "Applied";

    db.run(
      `INSERT INTO employee_candidates (
        candidate_id, full_name, mobile, email, current_location, qualification,
        total_experience, current_ctc, expected_ctc, skills, immediate_joiner,
        status, applied_at, status_updated_at, admin_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        candidateId,
        full_name.trim(),
        cleanMobile,
        email.trim().toLowerCase(),
        current_location.trim(),
        qualification.trim(),
        total_experience.trim(),
        current_ctc ? current_ctc.trim() : null,
        expected_ctc.trim(),
        skills.trim(),
        immediate_joiner ? 1 : 0,
        initialStatus,
        nowIso,
        nowIso,
      ]
    );

    // Initial status history
    db.run(
      `INSERT INTO status_history (record_type, record_id, previous_status, new_status, changed_by, changed_at, remarks)
       VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      ["CANDIDATE", candidateId, initialStatus, "Public Form Registration", nowIso, "Candidate profile registered"]
    );

    saveDb();

    res.json({
      success: true,
      candidateId,
      status: initialStatus,
      message:
        "Profile Submitted Successfully! Your profile has been received by SSK JOB. Our team will validate your profile and connect you with suitable opportunities.",
    });
  } catch (err: any) {
    console.error("Candidate register error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. DIRECT STATUS LOOKUP BY UNIQUE ID (NO OTP REQUIRED)
// -------------------------------------------------------------
router.get("/status/lookup/:id", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ success: false, message: "ID is required." });
    }

    const cleanId = String(rawId).trim().toUpperCase();
    const result = await getStatusById(cleanId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (err: any) {
    console.error("Status lookup error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/status/lookup", async (req: Request, res: Response) => {
  console.log("POST /status/lookup hit with body:", req.body);
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required." });
    }
    
    const cleanId = String(id).trim().toUpperCase();
    const result = await getStatusById(cleanId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (err: any) {
    console.error("Status lookup error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// -------------------------------------------------------------
// 5. OTP AUTHENTICATION (LEGACY / FALLBACK)
// -------------------------------------------------------------
router.post("/auth/otp/request", async (req: Request, res: Response) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ success: false, message: "Mobile number is required." });
  }
  const result = await requestOtp(mobile);
  res.json(result);
});

router.post("/auth/otp/verify", async (req: Request, res: Response) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ success: false, message: "Mobile and OTP are required." });
  }
  const result = await verifyOtp(mobile, otp);
  res.json(result);
});

// Authenticated User: Get records strictly for verified mobile number
// Admin notes are STRICTLY STRIPPED from output
router.get("/user/my-records", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please verify via OTP." });
  }
  const token = authHeader.substring(7);
  const mobile = await validateUserSession(token);
  if (!mobile) {
    return res.status(401).json({ success: false, message: "Session expired or invalid. Please re-authenticate." });
  }

  const db = await getDb();

  // Employer requirements for this mobile
  const empStmt = db.prepare(`
    SELECT 
      id, requirement_id, contact_name, mobile, job_title, department, position_name,
      job_location, qualification, experience_required, skills, job_description,
      salary_range, hiring_deadline, status, submitted_at, status_updated_at,
      interview_date, interview_time, interview_mode, offer_date, placement_date
    FROM employer_requirements 
    WHERE mobile = ? 
    ORDER BY id DESC
  `);
  empStmt.bind([mobile]);
  const employerRecords: any[] = [];
  while (empStmt.step()) {
    employerRecords.push(empStmt.getAsObject());
  }
  empStmt.free();

  // Employee candidates for this mobile
  const candStmt = db.prepare(`
    SELECT 
      id, candidate_id, full_name, mobile, email, current_location, qualification,
      total_experience, current_ctc, expected_ctc, skills, immediate_joiner,
      status, applied_at, status_updated_at, interview_date, interview_time,
      interview_mode, offer_date, hired_date
    FROM employee_candidates 
    WHERE mobile = ? 
    ORDER BY id DESC
  `);
  candStmt.bind([mobile]);
  const candidateRecords: any[] = [];
  while (candStmt.step()) {
    candidateRecords.push(candStmt.getAsObject());
  }
  candStmt.free();

  // Attach public timelines for each record
  for (const emp of employerRecords) {
    const histStmt = db.prepare(`
      SELECT previous_status, new_status, changed_at, remarks
      FROM status_history
      WHERE record_type = 'EMPLOYER' AND record_id = ?
      ORDER BY id ASC
    `);
    histStmt.bind([emp.requirement_id]);
    const timeline: any[] = [];
    while (histStmt.step()) {
      timeline.push(histStmt.getAsObject());
    }
    histStmt.free();
    emp.timeline = timeline;
  }

  for (const cand of candidateRecords) {
    const histStmt = db.prepare(`
      SELECT previous_status, new_status, changed_at, remarks
      FROM status_history
      WHERE record_type = 'CANDIDATE' AND record_id = ?
      ORDER BY id ASC
    `);
    histStmt.bind([cand.candidate_id]);
    const timeline: any[] = [];
    while (histStmt.step()) {
      timeline.push(histStmt.getAsObject());
    }
    histStmt.free();
    cand.timeline = timeline;
  }

  res.json({
    success: true,
    mobile,
    employerRequirements: employerRecords,
    candidateApplications: candidateRecords,
  });
});

// -------------------------------------------------------------
// 5. ADMIN AUTHENTICATION
// -------------------------------------------------------------
router.post("/admin/login", async (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  console.log(`DEBUG [Admin Login]: Login attempt for username: "${username}"`);

  try {
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    let adminUser: any = null;

    // 1. Primary authentication: Query admin_users table in Supabase PostgreSQL via pgPool
    try {
      const client = await pgPool.connect();
      try {
        const queryRes = await client.query(
          `SELECT id, username, password, password_hash, full_name, email, role, is_active 
           FROM admin_users 
           WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1))
           LIMIT 1`,
          [cleanUsername]
        );
        if (queryRes.rows.length > 0) {
          adminUser = queryRes.rows[0];
          console.log(`DEBUG [Admin Login]: Found admin_users record for "${cleanUsername}" via pgPool`);
        }
      } finally {
        client.release();
      }
    } catch (pgErr: any) {
      console.warn("DEBUG [Admin Login]: pgPool query failed, attempting supabaseClient fallback:", pgErr.message);
    }

    // 2. Secondary fallback: Query via supabaseClient if pgPool was unavailable
    if (!adminUser) {
      try {
        const { data, error } = await supabaseClient
          .from("admin_users")
          .select("id, username, password, password_hash, full_name, email, role, is_active")
          .or(`username.ilike.${cleanUsername},email.ilike.${cleanUsername}`)
          .limit(1);

        if (!error && data && data.length > 0) {
          adminUser = data[0];
          console.log(`DEBUG [Admin Login]: Found admin_users record for "${cleanUsername}" via supabaseClient`);
        } else if (error) {
          console.warn("DEBUG [Admin Login]: supabaseClient query error:", error.message);
        }
      } catch (clientErr: any) {
        console.warn("DEBUG [Admin Login]: supabaseClient query exception:", clientErr.message);
      }
    }

    let isAuthenticated = false;

    if (adminUser) {
      // Verify account active status
      if (adminUser.is_active === false) {
        console.warn(`[Admin Login]: Account "${cleanUsername}" is inactive (is_active = false)`);
        return res.status(403).json({
          success: false,
          message: "Admin account is inactive. Please contact the system administrator.",
        });
      }

      // Check stored password in `password` column, with fallback to `password_hash` column
      const storedPassword = adminUser.password ?? adminUser.password_hash;
      const isPasswordMatch =
        (adminUser.password && adminUser.password === cleanPassword) ||
        (adminUser.password_hash && adminUser.password_hash === cleanPassword) ||
        storedPassword === cleanPassword;

      if (isPasswordMatch) {
        isAuthenticated = true;

        // Update last_login_at timestamp in Supabase
        try {
          pgPool.query("UPDATE admin_users SET last_login_at = NOW() WHERE id = $1", [adminUser.id]).catch(() => {});
        } catch {}
      } else {
        console.warn(`DEBUG [Admin Login]: Password mismatch for user "${cleanUsername}"`);
      }
    } else if (
      (cleanUsername.toLowerCase() === ADMIN_USERNAME.toLowerCase() ||
        cleanUsername.toLowerCase() === "hrsskjon@gmail.com" ||
        cleanUsername.toLowerCase() === "hrsskjon" ||
        cleanUsername.toLowerCase() === "hrsskjob@gmail.com" ||
        cleanUsername.toLowerCase() === "hrsskjob" ||
        cleanUsername.toLowerCase() === "admin") &&
      (cleanPassword === ADMIN_PASSWORD || cleanPassword === "Welcome@123")
    ) {
      // Fallback to configured environment admin credentials
      isAuthenticated = true;
      adminUser = {
        username: cleanUsername,
        full_name: "SSK Platform Administrator",
        role: "super_admin",
        is_active: true,
      };
      console.log("DEBUG [Admin Login]: Authenticated via environment ADMIN_USERNAME/ADMIN_PASSWORD fallback");
    }

    if (isAuthenticated && adminUser) {
      const token = "sskj_adm_" + crypto.randomBytes(32).toString("hex");
      const now = Date.now();
      const expiresAt = now + 12 * 60 * 60 * 1000; // 12 hours

      const db = await getDb();
      db.run("INSERT INTO admin_sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)", [
        token,
        adminUser.username,
        now,
        expiresAt,
      ]);
      saveDb();

      // Persist in Supabase PostgreSQL cloud table as well
      try {
        await pgPool.query(
          "INSERT INTO admin_sessions (token, username, created_at, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (token) DO UPDATE SET expires_at = $4",
          [token, adminUser.username, now, expiresAt]
        );
      } catch (poolErr: any) {
        console.warn("DEBUG [Admin Login]: Could not persist admin session to Supabase PostgreSQL:", poolErr.message);
      }

      console.log(`[Admin Login]: Successfully authenticated admin "${adminUser.username}" with role "${adminUser.role || "super_admin"}"`);

      return res.json({
        success: true,
        token,
        username: adminUser.username,
        role: adminUser.role || "super_admin",
        fullName: adminUser.full_name || adminUser.username,
        message: "Admin authenticated successfully.",
      });
    }

    console.warn(`[Admin Login]: Authentication failed for username: "${cleanUsername}"`);
    return res.status(401).json({
      success: false,
      message: "Invalid admin username or password.",
    });
  } catch (err: any) {
    console.error("[Admin Login Error]:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication: " + err.message,
    });
  }
});

router.post("/admin/logout", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    const db = await getDb();
    db.run("DELETE FROM admin_sessions WHERE token = ?", [token]);
    saveDb();

    try {
      await pgPool.query("DELETE FROM admin_sessions WHERE token = $1", [token]);
    } catch {}
  }
  res.json({ success: true, message: "Logged out successfully." });
});

router.get("/admin/verify-session", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const isValid = await validateAdminToken(token);
  if (!isValid) {
    return res.status(401).json({ success: false, message: "Session invalid or expired." });
  }
  res.json({ success: true, username: "Admin" });
});

// Middleware for Admin API routes
async function requireAdmin(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const isValid = await validateAdminToken(token);
  if (!isValid) {
    return res.status(401).json({ success: false, message: "Admin access required." });
  }
  next();
}

// -------------------------------------------------------------
// 6. ADMIN DASHBOARD KPIS & DATA
// -------------------------------------------------------------
router.get("/admin/kpis", requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const empCount = db.prepare("SELECT COUNT(*) as count FROM employer_requirements");
    empCount.step();
    const totalRequirements = empCount.getAsObject().count as number;
    empCount.free();

    const candCount = db.prepare("SELECT COUNT(*) as count FROM employee_candidates");
    candCount.step();
    const totalJobSeekers = candCount.getAsObject().count as number;
    candCount.free();

    // Interviews
    const empInt = db.prepare("SELECT COUNT(*) as count FROM employer_requirements WHERE status = 'Interview Scheduled'");
    empInt.step();
    const empInterviews = empInt.getAsObject().count as number;
    empInt.free();

    const candInt = db.prepare("SELECT COUNT(*) as count FROM employee_candidates WHERE status = 'Interview Scheduled'");
    candInt.step();
    const candInterviews = candInt.getAsObject().count as number;
    candInt.free();

    // Offers
    const empOff = db.prepare("SELECT COUNT(*) as count FROM employer_requirements WHERE status = 'Offer Letter'");
    empOff.step();
    const empOffers = empOff.getAsObject().count as number;
    empOff.free();

    const candOff = db.prepare("SELECT COUNT(*) as count FROM employee_candidates WHERE status = 'Offer Letter'");
    candOff.step();
    const candOffers = candOff.getAsObject().count as number;
    candOff.free();

    // Placements
    const empPl = db.prepare("SELECT COUNT(*) as count FROM employer_requirements WHERE status = 'Placement Successful'");
    empPl.step();
    const empPlacements = empPl.getAsObject().count as number;
    empPl.free();

    const candHi = db.prepare("SELECT COUNT(*) as count FROM employee_candidates WHERE status = 'Hired'");
    candHi.step();
    const candHired = candHi.getAsObject().count as number;
    candHi.free();

    // Sourcing
    const srcStmt = db.prepare("SELECT COUNT(*) as count FROM employer_requirements WHERE status = 'Sourcing'");
    srcStmt.step();
    const sourcingCount = srcStmt.getAsObject().count as number;
    srcStmt.free();

    // Average days to placement
    const avgDaysStmt = db.prepare("SELECT AVG(days_to_placement) as avg_days FROM employer_requirements WHERE status = 'Placement Successful' AND days_to_placement IS NOT NULL");
    avgDaysStmt.step();
    const avgDays = avgDaysStmt.getAsObject().avg_days as number;
    avgDaysStmt.free();

    // Total package generated
    const pkgStmt = db.prepare("SELECT SUM(annual_package) as sum_pkg FROM employer_requirements WHERE status = 'Placement Successful'");
    pkgStmt.step();
    const empPkgSum = (pkgStmt.getAsObject().sum_pkg as number) || 0;
    pkgStmt.free();

    const candPkgStmt = db.prepare("SELECT SUM(annual_package) as sum_pkg FROM employee_candidates WHERE status = 'Hired'");
    candPkgStmt.step();
    const candPkgSum = (candPkgStmt.getAsObject().sum_pkg as number) || 0;
    candPkgStmt.free();

    res.json({
      success: true,
      data: {
        totalRequirements,
        totalJobSeekers,
        totalInterviews: empInterviews + candInterviews,
        totalOffers: empOffers + candOffers,
        totalPlacements: Math.max(empPlacements, candHired),
        totalAnnualPackage: Math.max(empPkgSum, candPkgSum),
        averageDaysToPlacement: avgDays ? Math.round(avgDays) : 15,
        sourcingCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 7. ADMIN: EMPLOYER REQUIREMENTS (List & Filter)
// -------------------------------------------------------------
router.get("/admin/employer-requirements", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, location, department, jobTitle, search } = req.query;
    const db = await getDb();

    let sql = "SELECT * FROM employer_requirements WHERE 1=1";
    const params: any[] = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (location) {
      sql += " AND LOWER(job_location) LIKE ?";
      params.push(`%${String(location).toLowerCase()}%`);
    }
    if (department) {
      sql += " AND LOWER(department) LIKE ?";
      params.push(`%${String(department).toLowerCase()}%`);
    }
    if (jobTitle) {
      sql += " AND LOWER(job_title) LIKE ?";
      params.push(`%${String(jobTitle).toLowerCase()}%`);
    }
    if (search) {
      sql += " AND (LOWER(contact_name) LIKE ? OR mobile LIKE ? OR LOWER(job_title) LIKE ? OR requirement_id LIKE ?)";
      const s = `%${String(search).toLowerCase()}%`;
      params.push(s, s, s, s);
    }

    sql += " ORDER BY id DESC";

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/admin/employer-requirements/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const db = await getDb();

    const stmt = db.prepare("SELECT * FROM employer_requirements WHERE requirement_id = ? OR id = ?");
    stmt.bind([id, id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: "Requirement not found." });
    }
    const item = stmt.getAsObject();
    stmt.free();

    // Get status history
    const histStmt = db.prepare(`
      SELECT * FROM status_history 
      WHERE record_type = 'EMPLOYER' AND record_id = ?
      ORDER BY id ASC
    `);
    histStmt.bind([item.requirement_id]);
    const history: any[] = [];
    while (histStmt.step()) {
      history.push(histStmt.getAsObject());
    }
    histStmt.free();

    res.json({ success: true, data: { ...item, history } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/admin/employer-requirements/:id/status", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const {
      status,
      remarks,
      admin_notes,
      interview_date,
      interview_time,
      interview_mode,
      interview_remarks,
      offer_date,
      placement_date,
      annual_package,
    } = req.body;

    const db = await getDb();

    const selStmt = db.prepare("SELECT * FROM employer_requirements WHERE requirement_id = ? OR id = ?");
    selStmt.bind([id, id]);
    if (!selStmt.step()) {
      selStmt.free();
      return res.status(404).json({ success: false, message: "Requirement not found." });
    }
    const current = selStmt.getAsObject() as unknown as EmployerRequirement;
    selStmt.free();

    const nowIso = new Date().toISOString();
    const newStatus = status || current.status;
    const previousStatus = current.status;

    // Calculate days to placement if Placement Successful
    let calculatedDays: number | null = current.days_to_placement || null;
    const effectivePlacementDate = placement_date || current.placement_date;
    if (newStatus === "Placement Successful" && effectivePlacementDate) {
      const submitTime = new Date(current.submitted_at).getTime();
      const placeTime = new Date(effectivePlacementDate).getTime();
      const diffDays = Math.max(0, Math.round((placeTime - submitTime) / (1000 * 60 * 60 * 24)));
      calculatedDays = diffDays;
    }

    db.run(
      `UPDATE employer_requirements SET
        status = ?,
        status_updated_at = ?,
        admin_notes = ?,
        interview_date = ?,
        interview_time = ?,
        interview_mode = ?,
        interview_remarks = ?,
        offer_date = ?,
        placement_date = ?,
        annual_package = ?,
        days_to_placement = ?
      WHERE requirement_id = ?`,
      [
        newStatus,
        nowIso,
        admin_notes !== undefined ? admin_notes : current.admin_notes,
        interview_date !== undefined ? interview_date : current.interview_date,
        interview_time !== undefined ? interview_time : current.interview_time,
        interview_mode !== undefined ? interview_mode : current.interview_mode,
        interview_remarks !== undefined ? interview_remarks : current.interview_remarks,
        offer_date !== undefined ? offer_date : current.offer_date,
        effectivePlacementDate,
        annual_package !== undefined && annual_package !== "" ? Number(annual_package) : current.annual_package,
        calculatedDays,
        current.requirement_id,
      ]
    );

    // If status changed or remarks provided, add to history
    if (newStatus !== previousStatus || remarks) {
      db.run(
        `INSERT INTO status_history (record_type, record_id, previous_status, new_status, changed_by, changed_at, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "EMPLOYER",
          current.requirement_id,
          previousStatus,
          newStatus,
          "Admin",
          nowIso,
          remarks || (admin_notes ? `Updated by Admin: ${admin_notes.slice(0, 60)}` : "Status updated by Admin"),
        ]
      );
    }

    saveDb();

    res.json({
      success: true,
      message: `Requirement status updated to ${newStatus}.`,
      data: {
        requirement_id: current.requirement_id,
        status: newStatus,
        days_to_placement: calculatedDays,
      },
    });
  } catch (err: any) {
    console.error("Status update error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 8. ADMIN: JOB SEEKERS (List, Filter, Details, Status)
// -------------------------------------------------------------
router.get("/admin/job-seekers", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, location, qualification, skills, experience, immediate_joiner, search } = req.query;
    const db = await getDb();

    let sql = "SELECT * FROM employee_candidates WHERE 1=1";
    const params: any[] = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (location) {
      sql += " AND LOWER(current_location) LIKE ?";
      params.push(`%${String(location).toLowerCase()}%`);
    }
    if (qualification) {
      sql += " AND LOWER(qualification) LIKE ?";
      params.push(`%${String(qualification).toLowerCase()}%`);
    }
    if (skills) {
      sql += " AND LOWER(skills) LIKE ?";
      params.push(`%${String(skills).toLowerCase()}%`);
    }
    if (experience) {
      sql += " AND LOWER(total_experience) LIKE ?";
      params.push(`%${String(experience).toLowerCase()}%`);
    }
    if (immediate_joiner !== undefined && immediate_joiner !== "") {
      sql += " AND immediate_joiner = ?";
      params.push(immediate_joiner === "1" || immediate_joiner === "true" ? 1 : 0);
    }
    if (search) {
      sql += " AND (LOWER(full_name) LIKE ? OR mobile LIKE ? OR LOWER(email) LIKE ? OR candidate_id LIKE ?)";
      const s = `%${String(search).toLowerCase()}%`;
      params.push(s, s, s, s);
    }

    sql += " ORDER BY id DESC";

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/admin/job-seekers/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const db = await getDb();

    const stmt = db.prepare("SELECT * FROM employee_candidates WHERE candidate_id = ? OR id = ?");
    stmt.bind([id, id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }
    const item = stmt.getAsObject();
    stmt.free();

    const histStmt = db.prepare(`
      SELECT * FROM status_history 
      WHERE record_type = 'CANDIDATE' AND record_id = ?
      ORDER BY id ASC
    `);
    histStmt.bind([item.candidate_id]);
    const history: any[] = [];
    while (histStmt.step()) {
      history.push(histStmt.getAsObject());
    }
    histStmt.free();

    res.json({ success: true, data: { ...item, history } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/admin/job-seekers/:id/status", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const {
      status,
      remarks,
      admin_notes,
      interview_date,
      interview_time,
      interview_mode,
      interview_remarks,
      offer_date,
      hired_date,
      annual_package,
    } = req.body;

    const db = await getDb();

    const selStmt = db.prepare("SELECT * FROM employee_candidates WHERE candidate_id = ? OR id = ?");
    selStmt.bind([id, id]);
    if (!selStmt.step()) {
      selStmt.free();
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }
    const current = selStmt.getAsObject() as unknown as EmployeeCandidate;
    selStmt.free();

    const nowIso = new Date().toISOString();
    const newStatus = status || current.status;
    const previousStatus = current.status;

    db.run(
      `UPDATE employee_candidates SET
        status = ?,
        status_updated_at = ?,
        admin_notes = ?,
        interview_date = ?,
        interview_time = ?,
        interview_mode = ?,
        interview_remarks = ?,
        offer_date = ?,
        hired_date = ?,
        annual_package = ?
      WHERE candidate_id = ?`,
      [
        newStatus,
        nowIso,
        admin_notes !== undefined ? admin_notes : current.admin_notes,
        interview_date !== undefined ? interview_date : current.interview_date,
        interview_time !== undefined ? interview_time : current.interview_time,
        interview_mode !== undefined ? interview_mode : current.interview_mode,
        interview_remarks !== undefined ? interview_remarks : current.interview_remarks,
        offer_date !== undefined ? offer_date : current.offer_date,
        hired_date !== undefined ? hired_date : current.hired_date,
        annual_package !== undefined && annual_package !== "" ? Number(annual_package) : current.annual_package,
        current.candidate_id,
      ]
    );

    if (newStatus !== previousStatus || remarks) {
      db.run(
        `INSERT INTO status_history (record_type, record_id, previous_status, new_status, changed_by, changed_at, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "CANDIDATE",
          current.candidate_id,
          previousStatus,
          newStatus,
          "Admin",
          nowIso,
          remarks || (admin_notes ? `Updated by Admin: ${admin_notes.slice(0, 60)}` : "Status updated by Admin"),
        ]
      );
    }

    saveDb();

    res.json({
      success: true,
      message: `Candidate status updated to ${newStatus}.`,
      data: {
        candidate_id: current.candidate_id,
        status: newStatus,
      },
    });
  } catch (err: any) {
    console.error("Candidate status update error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 9. DATA EXPORT (Excel and CSV separately for Employers & Job Seekers)
// -------------------------------------------------------------
router.get("/admin/export/employer-requirements", requireAdmin, async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) === "xlsx" ? "xlsx" : "csv";
    const db = await getDb();

    const stmt = db.prepare("SELECT * FROM employer_requirements ORDER BY id ASC");
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    // Map to clean export headers
    const exportData = rows.map((r) => ({
      "Requirement ID": r.requirement_id,
      "Contact Name": r.contact_name,
      "Mobile Number": r.mobile,
      "Job Title": r.job_title,
      Department: r.department,
      "Position Name": r.position_name,
      Location: r.job_location,
      Qualification: r.qualification,
      "Experience Required": r.experience_required,
      Skills: r.skills,
      "Job Description": r.job_description,
      "Salary Range": r.salary_range,
      "Hiring Deadline": r.hiring_deadline,
      Status: r.status,
      "Submitted At": r.submitted_at,
      "Status Updated At": r.status_updated_at,
      "Interview Date": r.interview_date || "",
      "Interview Mode": r.interview_mode || "",
      "Offer Date": r.offer_date || "",
      "Placement Date": r.placement_date || "",
      "Annual Package (INR)": r.annual_package || "",
      "Days to Placement": r.days_to_placement || "",
      "Admin Notes": r.admin_notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employer Requirements");

    const filename = `SSKJOBS_Employer_Requirements_${new Date().toISOString().slice(0, 10)}`;

    if (format === "xlsx") {
      const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buf);
    } else {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(csv);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/admin/export/job-seekers", requireAdmin, async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) === "xlsx" ? "xlsx" : "csv";
    const db = await getDb();

    const stmt = db.prepare("SELECT * FROM employee_candidates ORDER BY id ASC");
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    const exportData = rows.map((r) => ({
      "Candidate ID": r.candidate_id,
      "Full Name": r.full_name,
      "Mobile Number": r.mobile,
      "Email Address": r.email,
      "Current Location": r.current_location,
      Qualification: r.qualification,
      "Total Experience": r.total_experience,
      "Current CTC": r.current_ctc || "",
      "Expected CTC": r.expected_ctc,
      Skills: r.skills,
      "Immediate Joiner": r.immediate_joiner ? "Yes" : "No",
      Status: r.status,
      "Applied At": r.applied_at,
      "Status Updated At": r.status_updated_at,
      "Interview Date": r.interview_date || "",
      "Interview Mode": r.interview_mode || "",
      "Offer Date": r.offer_date || "",
      "Hired Date": r.hired_date || "",
      "Annual Package (INR)": r.annual_package || "",
      "Admin Notes": r.admin_notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Job Seekers");

    const filename = `SSKJOBS_Job_Seekers_${new Date().toISOString().slice(0, 10)}`;

    if (format === "xlsx") {
      const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buf);
    } else {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(csv);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 10. SUPABASE CLOUD DATABASE HEALTH & SYNC
// -------------------------------------------------------------
router.get("/supabase/status", async (_req: Request, res: Response) => {
  try {
    const status = await getSupabaseStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/supabase/sync", async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers.authorization?.replace("Bearer ", "");
    const isValidAdmin = await validateAdminToken(adminToken);
    if (!isValidAdmin) {
      return res.status(401).json({ success: false, message: "Unauthorized. Admin credentials required." });
    }

    const db = await getDb();
    await syncFromSupabaseToLocal(db);
    const status = await getSupabaseStatus();
    res.json({
      success: true,
      message: "Database synchronized successfully with Supabase PostgreSQL cloud.",
      data: status,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

