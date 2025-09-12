import { FlatCompat } from '@eslint/eslintrc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    {
        ignores: ['.next', 'node_modules', 'dist', 'public'],
    },
    // Блок 1: Базовая конфигурация для Next.js приложения
    ...compat
        .extends('next/core-web-vitals', 'next/typescript')
        .map(config => ({
            ...config,
            files: ['src/**/*.{ts,tsx}'],
        })),
    // Блок 2: Наши кастомные правила, применяемые поверх базовых
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            // Запрет any типов для безопасности
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': 'warn',
            'prefer-const': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
            'simple-import-sort/imports': [
                'warn',
                {
                    groups: [
                        ['^react', '^next', '^@?\\w'],
                        ['^@/.*$'],
                        ['^\\u0000'],
                        ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                        ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
                        ['^.+\\.s?css$'],
                    ],
                },
            ],
            'simple-import-sort/exports': 'error',
        },
    },
];

export default eslintConfig;
