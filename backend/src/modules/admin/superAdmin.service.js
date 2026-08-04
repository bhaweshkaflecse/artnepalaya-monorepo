import { env } from '../../config/env.js';
import { SuperAdminAuditLog } from './superAdminAuditLog.model.js';
import { User } from '../users/user.model.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// In-memory store for rate limiting master password failures
// Maps actorId_ip to { count: number, lockUntil: number }
const failedAttemptsMap = new Map();

export const isProtectedSuperAdmin = (user) => {
  if (!user || user.role !== 'Admin') return false;
  
  const idStr = user._id.toString();
  const email = user.email || '';
  
  const isProtectedId = env.SUPER_ADMIN_IDS?.includes(idStr) || false;
  const isProtectedEmail = env.SUPER_ADMIN_EMAILS?.includes(email) || false;
  
  return isProtectedId || isProtectedEmail;
};

export const logSuperAdminAction = async ({
  actorId,
  targetId,
  targetEmail,
  action,
  reason = '',
  ipAddress = '',
  userAgent = '',
  success,
}) => {
  try {
    const actor = await User.findById(actorId).select('email').lean();
    await SuperAdminAuditLog.create({
      actorId,
      actorEmail: actor?.email || 'Unknown',
      targetId,
      targetEmail,
      action,
      reason,
      ipAddress,
      userAgent,
      success,
    });
  } catch (error) {
    console.error('Failed to write Super Admin audit log:', error);
  }
};

export const verifyMasterPasswordAndRateLimit = async (password, ipAddress, actorId) => {
  const now = Date.now();
  const rateKey = `${actorId}_${ipAddress}`;
  const record = failedAttemptsMap.get(rateKey) || { count: 0, lockUntil: 0 };
  
  // Check if currently locked
  if (record.lockUntil > now) {
    const minutesLeft = Math.ceil((record.lockUntil - now) / 60000);
    throw Object.assign(new Error(`Too many failed attempts. Try again in ${minutesLeft} minutes.`), { status: 429 });
  }

  // Clear lock if expired
  if (record.lockUntil <= now && record.count > 0) {
    record.count = 0;
    record.lockUntil = 0;
  }

  // Verify password
  let isMatch = false;
  if (password) {
    const masterPassword = env.SUPER_ADMIN_MASTER_CONFIRMATION_PASSWORD || '';
    if (masterPassword.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, masterPassword);
    } else {
      const a = Buffer.from(password);
      const b = Buffer.from(masterPassword);
      isMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
    }
  }

  if (!isMatch) {
    record.count += 1;
    if (record.count >= 5) {
      record.lockUntil = now + 15 * 60 * 1000; // 15 minutes lock
    }
    failedAttemptsMap.set(rateKey, record);
    
    throw Object.assign(new Error('Invalid Master Confirmation Password'), { status: 403, code: 'MASTER_PASSWORD_INVALID' });
  }

  // Success, reset failures for this key
  failedAttemptsMap.delete(rateKey);
  return true;
};

export const ensureMinActiveSuperAdmins = async (targetUserId) => {
  const allAdmins = await User.find({ role: 'Admin', status: 'active', deletedAt: null }).lean();
  
  const activeProtectedAdmins = allAdmins.filter(isProtectedSuperAdmin);
  const minRequired = env.MIN_ACTIVE_SUPERADMINS;
  
  // If we are modifying one of the active protected admins, check if it would drop below minimum
  const isTargetActiveProtected = activeProtectedAdmins.some(admin => admin._id.toString() === targetUserId.toString());
  
  if (isTargetActiveProtected && activeProtectedAdmins.length <= minRequired) {
    throw Object.assign(
      new Error(`Cannot perform this action. Minimum ${minRequired} active protected Super Admin(s) must remain.`),
      { status: 403, code: 'LAST_SUPER_ADMIN_PROTECTED' }
    );
  }
  
  return true;
};
