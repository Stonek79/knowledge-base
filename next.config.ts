/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    typedRoutes: true,
    productionBrowserSourceMaps: false,
    experimental: {
        optimizePackageImports: ['@mui/material', '@mui/icons-material'],
        webpackBuildWorker: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config, { isServer }) => {
        // Полностью исключаем canvas из webpack resolution
        // pdfjs-dist может работать без него на клиенте
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...config.resolve.alias,
            canvas: false,
        };

        // Также добавляем в externals для серверной части
        if (isServer) {
            config.externals = config.externals || [];
            if (Array.isArray(config.externals)) {
                config.externals.push('canvas');
            }
        }

        return config;
    },
};

export default nextConfig;
