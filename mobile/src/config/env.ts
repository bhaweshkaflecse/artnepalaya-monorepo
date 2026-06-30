// src/config/env.ts

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is missing. Configure .env.development (local) or .env.production (production)."
  );
}

export const ENV = {
  API_URL,
  SOCKET_URL: API_URL.replace(/\/api\/v1\/?$/, ""),
};