/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  },
  images: {
    domains: ['localhost', 'numismatics.org', 'gallica.bnf.fr','finds.org.uk','ikmk.smb.museum','media.britishmuseum.org','exploratorium.galloromeinsmuseum.be','numid.uni-mainz.de','www.ikmk.at','archaeologie.uni-muenster.de','www.kenom.de']
  }
};

export default nextConfig;
