import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's dev-tools badge renders bottom-left regardless of `position` and
  // overlaps the sidebar's user-profile control there — disable it (dev-only
  // chrome, absent from production builds anyway).
  devIndicators: false,
};

export default nextConfig;
