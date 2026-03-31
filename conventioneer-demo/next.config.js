/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Konva's node entry point tries to require 'canvas' which is a native
    // module we don't need in the browser. Tell webpack to ignore it.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    // On the server side, externalize canvas so webpack doesn't try to bundle it
    if (isServer) {
      config.externals = [...(config.externals || []), { canvas: "canvas" }];
    }
    return config;
  },
};

module.exports = nextConfig;
