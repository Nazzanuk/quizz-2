import type { NextConfig } from 'next';

// Security headers applied to every response. The CSP uses 'unsafe-inline' for
// scripts rather than a per-request nonce: Next statically prerenders most pages
// at build time, and a nonce/strict-dynamic policy would block those pages'
// inline bootstrap scripts in production (they have no request-time nonce).
// 'unsafe-eval' is added only in dev, where Turbopack/HMR need it.
const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self'`,
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  `worker-src 'self'`,
  `manifest-src 'self'`,
  `media-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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
