/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/today',
        destination: '/dashboard',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
