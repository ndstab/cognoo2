/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set the directory where your pages/app are located
  dir: 'frontend',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        punycode: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig 