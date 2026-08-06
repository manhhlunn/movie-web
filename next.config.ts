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
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "phimimg.com",
      },
      {
        protocol: "https",
        hostname: "*.phimimg.com",
      },
      {
        protocol: "https",
        hostname: "phimapi.com",
      },
      {
        protocol: "https",
        hostname: "*.phimapi.com",
      },
      {
        protocol: "https",
        hostname: "phim.nguonc.com",
      },
      {
        protocol: "https",
        hostname: "*.nguonc.com",
      },
      {
        protocol: "https",
        hostname: "nguonc.com",
      },
      {
        protocol: "https",
        hostname: "vsmov.com",
      },
      {
        protocol: "https",
        hostname: "*.vsmov.com",
      },
    ],
  },
};

export default nextConfig;
