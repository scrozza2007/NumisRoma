/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
let apiHost;
try {
  apiHost = new URL(apiUrl).hostname;
} catch {
  apiHost = undefined;
}

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.numisroma.com' },
      ...(apiHost ? [{ protocol: 'http', hostname: apiHost }, { protocol: 'https', hostname: apiHost }] : []),
      { protocol: 'http', hostname: 'localhost' },
    ],
    unoptimized: true
  }
};

export default nextConfig;
