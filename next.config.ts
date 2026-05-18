import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Chú ý: Đưa key vào đây để deploy có thể chạy ngay theo yêu cầu.
    // Nếu muốn bảo mật tuyệt đối, bạn nên chuyển key này lên Vercel Environment Variables.
    GOOGLE_AI_API_KEY: "AIzaSyALMy3YAdsGspkgcZG3Xd5I0iBgKS5vT5k",
  },
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
    ],
  },
};

export default nextConfig;
