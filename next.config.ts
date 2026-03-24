import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow network access from local devices in development (e.g. mobile preview)
  allowedDevOrigins: ['192.168.1.4'],

  // Skip type-checking during build (tsc runs separately via npm run type-check)
  typescript: { ignoreBuildErrors: true },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  // Ensures server-only code never leaks to client
  serverExternalPackages: ['@node-rs/argon2', '@node-rs/bcrypt'],
}

export default nextConfig
