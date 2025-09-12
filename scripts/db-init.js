import pkg from '@prisma/client';
import { execSync } from 'child_process';
// import { config as loadEnv } from 'dotenv';
import { Client as PgClient } from 'pg';

if (process.env.NODE_ENV !== 'production') {
    try {
        await import('dotenv/config');
        loadEnv({ path: '.env.local' });
        loadEnv();
    } catch {}
}

const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined');
}
const url = new URL(dbUrl);
const dbName = url.pathname.replace(/^\//, '');
const adminUrl = new URL(dbUrl);
adminUrl.pathname = '/postgres'; // подключаемся к системной БД

const pg = new PgClient({ connectionString: adminUrl.toString() });
await pg.connect();
const exists = await pg.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    dbName,
]);
if (exists.rowCount === 0) {
    await pg.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Создана БД ${dbName}`);
} else {
    console.log(`ℹ️ БД ${dbName} уже существует`);
}
await pg.end();

const shouldSeed =
    process.env.SEED_ON_STARTUP === 'true' ||
    process.env.NODE_ENV !== 'production';

console.log('[SEED]', shouldSeed);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

for (let attempt = 1; attempt <= 10; attempt++) {
    try {
        console.log(`🔄 Подключение к БД (попытка ${attempt}/10)...`);
        await prisma.$connect();
        break;
    } catch (e) {
        console.warn('⏳ БД недоступна, ждём 3с...', e);
        await wait(3000);
        if (attempt === 10) throw e;
    }
}

console.log('🚚 Применяем миграции...');
execSync('npx prisma migrate deploy', { stdio: 'inherit' });

if (shouldSeed) {
    console.log('🔄 Запуск seed...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
} else {
    console.log('↩️ Сид пропущен (SEED_ON_STARTUP != true и PROD)');
}

await prisma.$disconnect();
