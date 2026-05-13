import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    qualities: [75, 85, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.ophim.live",
      },
      {
        protocol: "https",
        hostname: "ophim.live",
      },
      {
        protocol: "https",
        hostname: "*.ophim.live",
      },
      {
        protocol: "https",
        hostname: "ophim1.com",
      },
      {
        protocol: "https",
        hostname: "*.ophim1.com",
      },
      {
        protocol: "https",
        hostname: "apii.ophim.live",
      },
    ],
  },
};

export default nextConfig;
