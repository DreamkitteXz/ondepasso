import type { NextConfig } from "next";

// Site 100% estático: `npm run build` gera a pasta out/ pronta para o Cloudflare Pages.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
