import type { NextConfig } from "next";

const config: NextConfig = {
  ...(process.env.READMISSION_STATIC_EXPORT === '1' ? { output: 'export' as const, trailingSlash: true, env: { NEXT_PUBLIC_API_BASE_URL: "" } } : {}),
  devIndicators: false,
};

export default config;
