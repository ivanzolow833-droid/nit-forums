import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export works on Cloudflare Pages (and still on Netlify/Vercel)
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
