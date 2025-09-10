/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Отключаем проверку типов при сборке
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
