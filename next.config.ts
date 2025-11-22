/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    typedRoutes: true,
    experimental: {
        optimizePackageImports: ['@mui/material', '@mui/icons-material'],
        webpackBuildWorker: true,
    },
}

export default nextConfig
