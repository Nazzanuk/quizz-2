import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

const withPwa = async (config: NextConfig) => {
  if (process.env.NODE_ENV !== 'production') return config;
  const withSerwistInit = (await import('@serwist/next')).default;
  return withSerwistInit({
    swSrc: 'src/app/sw.ts',
    swDest: 'public/sw.js',
  })(config);
};

export default withPwa(nextConfig);
