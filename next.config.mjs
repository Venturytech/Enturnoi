/** @type {import('next').NextConfig} */
const nextConfig = {
  // El catálogo de prototipos en /screens no forma parte del build.
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
