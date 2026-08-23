import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build for VPS / Docker / Node hosts
  output: "standalone",
};

export default nextConfig;
