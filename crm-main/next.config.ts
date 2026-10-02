import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(process.env.NODE_ENV === "development" ? {
    allowedDevOrigins: ["*.app.github.dev"],
    experimental: {
      serverActions: {
        allowedOrigins: ["localhost:3000", "*.app.github.dev"],
      },
    },
  } : {}),
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
