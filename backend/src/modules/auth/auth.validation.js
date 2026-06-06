import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 standard

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "idToken is required"),
    deviceId: z.string().min(1, "deviceId is required for session tracking") // Added here so Google login tracks devices too!
  })
});

export const sendOtpSchema = z.object({
  body: z.object({
    phoneNumber: z.string().regex(phoneRegex, "Invalid phone number format") // Changed to phoneNumber
  })
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phoneNumber: z.string().regex(phoneRegex, "Invalid phone number format"), // Changed to phoneNumber
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
    deviceId: z.string().min(1, "deviceId is required for session tracking")
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "refreshToken is required")
  })
});

export const logoutSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1, "deviceId is required")
  })
});

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});