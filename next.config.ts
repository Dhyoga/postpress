import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js dan sharp punya binary .node native — webpack tidak bisa
  // membundelnya (route handler yang memakai lib/render/render.ts akan gagal
  // compile dengan "Module parse failed: Unexpected character"). Biarkan
  // Next me-require keduanya langsung saat runtime alih-alih dibundel.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
};

export default nextConfig;
