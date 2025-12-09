/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    typedRoutes: true,
    serverExternalPackages: ['pdfjs-dist', 'canvas'],
    experimental: {
        optimizePackageImports: ['@mui/material', '@mui/icons-material'],
        webpackBuildWorker: true,
    },
}

export default nextConfig
