import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js'; 
import { redisClient } from '../../server.js'; 
import { User } from '../users/user.model.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const OTP_TTL = 300; // 5 minutes
const REFRESH_TTL = 30 * 24 * 60 * 60; // 30 days for hassle-free UX

export const generateTokens = async (userId, role, deviceId) => {
  if (!deviceId) throw Object.assign(new Error('Device ID is required'), { status: 400 });

  const accessToken = jwt.sign({ id: userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId, deviceId }, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

  await redisClient.setEx(`auth:refresh:${userId}:${deviceId}`, REFRESH_TTL, refreshToken);

  return { accessToken, refreshToken };
};

export const authenticateWithGoogle = async (idToken, deviceId) => {
  if (!deviceId) throw Object.assign(new Error('Device ID is required'), { status: 400 });

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  
  let user = await User.findOne({ email: payload.email });
  if (!user) {
    user = await User.create({
      email: payload.email,
      username: payload.name,
      avatarUrl: payload.picture,
      status: 'active',
      role: 'Art Lover' 
    });
  }

  const tokens = await generateTokens(user._id, user.role, deviceId);
  return { user, ...tokens };
};

export const sendOtp = async (phoneNumber) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redisClient.setEx(`auth:otp:${phoneNumber}`, OTP_TTL, otp);
  
  console.log(`[DEV] OTP for ${phoneNumber} is ${otp}`);
  return true;
};

// RE-ENGINEERED: Now links to an existing user session
export const verifyAndLinkPhone = async (userId, phoneNumber, otp) => {
  const storedOtp = await redisClient.get(`auth:otp:${phoneNumber}`);
  
  if (!storedOtp || storedOtp !== otp) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });
  }

  // Check if phone is already claimed
  const existingPhone = await User.findOne({ phoneNumber });
  if (existingPhone && existingPhone._id.toString() !== userId) {
    throw Object.assign(new Error('Phone number already linked to another account'), { status: 409 });
  }

  await redisClient.del(`auth:otp:${phoneNumber}`);
  
  const user = await User.findByIdAndUpdate(
    userId,
    { phoneNumber },
    { new: true }
  );

  return user;
};

export const refreshSession = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const storedToken = await redisClient.get(`auth:refresh:${decoded.id}:${decoded.deviceId}`);

    if (!storedToken || storedToken !== refreshToken) {
      throw Object.assign(new Error('Session revoked'), { status: 401 });
    }

    const user = await User.findById(decoded.id).select('role').lean();
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    return await generateTokens(decoded.id, user.role, decoded.deviceId);
  } catch (err) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }
};

export const logout = async (userId, deviceId) => {
  await redisClient.del(`auth:refresh:${userId}:${deviceId}`);
  return true;
};

export const authenticateAdmin = async (email, password) => {
  const user = await User.findOne({ email }).select('+passwordHash').lean();
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (user.role !== 'Admin') throw Object.assign(new Error('Access denied. Admin role required.'), { status: 403 });
  if (!user.passwordHash) throw Object.assign(new Error('Password login not configured for this account'), { status: 401 });

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const tokens = await generateTokens(user._id.toString(), user.role, 'admin-panel');
  const { passwordHash, ...safeUser } = user;
  return { user: safeUser, ...tokens };
};