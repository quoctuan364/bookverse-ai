import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js cần inline bootstrap script; unsafe-eval chỉ được phép trong dev.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://127.0.0.1:* http://localhost:*",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Action nhận ảnh tối đa 2 MB cùng các trường hồ sơ.
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  // Tự động convert ảnh bìa sách sang AVIF/WebP, giảm 50–70% kích thước so với JPEG/PNG gốc.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600, // cache ảnh đã resize trong 1 giờ
  },
  serverExternalPackages: ["@prisma/client", "bcrypt", "csv-parser"],
  // Cho phép đường dẫn demo 127.0.0.1 dùng tài nguyên dev của Next.js.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          ...(isProduction
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
