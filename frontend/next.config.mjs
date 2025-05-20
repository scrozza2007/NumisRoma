/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  },
  images: {
    domains: ['numismatics.org', 'gallica.bnf.fr']
  }
};

export default nextConfig;
