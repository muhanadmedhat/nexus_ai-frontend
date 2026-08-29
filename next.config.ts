import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const rootDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: false,
  },
  turbopack: {
    root: rootDir,
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@splinetool/react-spline/next": resolve(
        rootDir,
        "node_modules/@splinetool/react-spline/dist/react-spline-next.js",
      ),
    };

    return config;
  },
};

export default nextConfig;
