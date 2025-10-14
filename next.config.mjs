/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dffwvipoaelfkiikfyvd.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/product-images/**',
      },
    ],
  },
};

export default nextConfig;
