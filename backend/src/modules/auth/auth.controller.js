import * as authService from './auth.service.js';

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken, deviceId } = req.body;
    const result = await authService.authenticateWithGoogle(idToken, deviceId);
    res.status(200).json({ success: true, message: "Login successful", data: result });
  } catch (err) {
    next(err);
  }
};

export const sendOtp = async (req, res, next) => {
  try {
    await authService.sendOtp(req.body.phoneNumber);
    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
};

export const verifyPhone = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;
    const result = await authService.verifyAndLinkPhone(req.user.id, phoneNumber, otp);
    res.status(200).json({ success: true, message: "Phone linked successfully", data: result });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const tokens = await authService.refreshSession(req.body.refreshToken);
    res.status(200).json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id, req.body.deviceId);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticateAdmin(email, password);
    res.status(200).json({ success: true, message: "Admin login successful", data: result });
  } catch (err) {
    next(err);
  }
};