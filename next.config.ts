import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const isHttpsEnabled = process.env.BOOKVERSE_HTTPS_ENABLED === "true";
// Không để `next build` ghi đè asset của `next dev` đang chạy. Đây là nguyên
// nhân trình duyệt nhận HTML mới nhưng /_next/static/css/app/layout.css bị 404.
const defaultDistDir = isProduction ? ".next" : ".next-dev";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js cần inline bootstrap script; unsafe-eval chỉ được phép trong dev.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://127.0.0.1:* http://localhost:* http://192.168.*:* ws://127.0.0.1:* ws://localhost:* ws://192.168.*:* wss:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttpsEnabled ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  // Biến môi trường vẫn có quyền ưu tiên cho E2E/report; dev dùng cache riêng.
  distDir: process.env.BOOKVERSE_DIST_DIR || defaultDistDir,
  compress: true,
  reactStrictMode: true,
  experimental: {
    // Server Action nhận ảnh tối đa 2 MB cùng các trường hồ sơ.
    serverActions: {
      bodySizeLimit: "3mb",
    },
    optimizePackageImports: ["lucide-react"],
  },
  // WebP giảm dung lượng tốt và tránh bề mặt xử lý AVIF chưa cần thiết cho bản demo.
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 86400, // cache ảnh đã resize trong 1 ngày (bìa sách hiếm khi thay đổi)
  },
  serverExternalPackages: ["@prisma/client", "bcrypt", "csv-parser"],
  // Cho phép đường dẫn demo 127.0.0.1 và mạng LAN dùng tài nguyên dev của Next.js.
  allowedDevOrigins: [
    "127.0.0.1",
    "127.0.0.1:3000",
    "localhost",
    "localhost:3000",
    "192.168.1.213",
    "192.168.1.213:3000",
    "*.local",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          ...(isProduction && isHttpsEnabled
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
