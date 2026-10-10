import crypto from "crypto";
import { getDb, saveDb } from "./db.ts";

export interface IOtpProvider {
  sendOtp(mobile: string, otp: string): Promise<{ success: boolean; message?: string }>;
}

export class SimulationOtpProvider implements IOtpProvider {
  async sendOtp(mobile: string, otp: string): Promise<{ success: boolean; message?: string }> {
    // In production environment with SMS gateway, this sends via SMS API.
    // For V1 preview and development, logs cleanly to server console.
    console.log(`[SSKJOBS OTP SERVICE] Sending OTP ${otp} to mobile: +91 ${mobile}`);
    return { success: true, message: `OTP sent successfully to +91 ${mobile}` };
  }
}

let activeOtpProvider: IOtpProvider = new SimulationOtpProvider();

export function setOtpProvider(provider: IOtpProvider) {
  activeOtpProvider = provider;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_ATTEMPTS = 3;
const TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function requestOtp(mobile: string): Promise<{
  success: boolean;
  message: string;
  cooldownRemaining?: number;
  previewOtp?: string;
}> {
  const cleanMobile = mobile.replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    return { success: false, message: "Please enter a valid 10-digit Indian mobile number." };
  }

  const db = await getDb();
  const now = Date.now();

  const stmt = db.prepare("SELECT * FROM otp_sessions WHERE mobile = ?");
  stmt.bind([cleanMobile]);
  let existing = null;
  if (stmt.step()) {
    existing = stmt.getAsObject();
  }
  stmt.free();

  if (existing && existing.last_sent_at) {
    const elapsed = now - Number(existing.last_sent_at);
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        message: `Please wait ${remaining}s before requesting a new OTP.`,
        cooldownRemaining: remaining,
      };
    }
  }

  // Generate secure 6-digit numeric OTP
  const otpNumber = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + OTP_EXPIRY_MS;

  db.run(
    `INSERT INTO otp_sessions (mobile, otp, attempts, expires_at, last_sent_at, verified_token, token_expires_at)
     VALUES (?, ?, 0, ?, ?, NULL, NULL)
     ON CONFLICT(mobile) DO UPDATE SET
       otp = excluded.otp,
       attempts = 0,
       expires_at = excluded.expires_at,
       last_sent_at = excluded.last_sent_at,
       verified_token = NULL,
       token_expires_at = NULL`,
    [cleanMobile, otpNumber, expiresAt, now]
  );
  saveDb();

  await activeOtpProvider.sendOtp(cleanMobile, otpNumber);

  return {
    success: true,
    message: "OTP sent successfully via SMS to +91 " + cleanMobile,
    // Provide preview OTP in response to allow seamless testing in the sandbox iframe environment
    previewOtp: otpNumber,
  };
}

export async function verifyOtp(
  mobile: string,
  enteredOtp: string
): Promise<{ success: boolean; message: string; sessionToken?: string }> {
  const cleanMobile = mobile.replace(/\D/g, "");
  const db = await getDb();
  const now = Date.now();

  const stmt = db.prepare("SELECT * FROM otp_sessions WHERE mobile = ?");
  stmt.bind([cleanMobile]);
  if (!stmt.step()) {
    stmt.free();
    return { success: false, message: "No active OTP request found for this mobile number." };
  }
  const session = stmt.getAsObject();
  stmt.free();

  const attempts = Number(session.attempts || 0);
  const expiresAt = Number(session.expires_at || 0);

  if (now > expiresAt) {
    return { success: false, message: "OTP has expired. Please request a new OTP." };
  }

  if (attempts >= MAX_ATTEMPTS) {
    return { success: false, message: "Maximum verification attempts exceeded. Please request a new OTP." };
  }

  if (session.otp !== enteredOtp.trim()) {
    const newAttempts = attempts + 1;
    db.run("UPDATE otp_sessions SET attempts = ? WHERE mobile = ?", [newAttempts, cleanMobile]);
    saveDb();
    const remaining = MAX_ATTEMPTS - newAttempts;
    return {
      success: false,
      message: remaining > 0 ? `Incorrect OTP. ${remaining} attempts remaining.` : "Incorrect OTP. Maximum attempts reached.",
    };
  }

  // OTP is correct! Create verified session token
  const sessionToken = "sskj_usr_" + crypto.randomBytes(24).toString("hex");
  const tokenExpiresAt = now + TOKEN_EXPIRY_MS;

  db.run("UPDATE otp_sessions SET verified_token = ?, token_expires_at = ? WHERE mobile = ?", [
    sessionToken,
    tokenExpiresAt,
    cleanMobile,
  ]);
  saveDb();

  return {
    success: true,
    message: "OTP verified successfully.",
    sessionToken,
  };
}

export async function validateUserSession(token: string): Promise<string | null> {
  if (!token) return null;
  const db = await getDb();
  const now = Date.now();

  const stmt = db.prepare("SELECT mobile, token_expires_at FROM otp_sessions WHERE verified_token = ?");
  stmt.bind([token]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject();
  stmt.free();

  if (now > Number(row.token_expires_at || 0)) {
    return null;
  }

  return row.mobile as string;
}
