import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // 1. Create Users
    const hashedPasswordAdmin = await bcrypt.hash('adminpassword', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: { enabled: true },
        create: {
            username: 'admin',
            password: hashedPasswordAdmin,
            role: Role.ADMIN,
            enabled: true,
        },
    });
    console.log('Admin user created/updated.');

    const hashedPasswordUser = await bcrypt.hash('userpassword', 10);
    const user = await prisma.user.upsert({
        where: { username: 'user' },
        update: { enabled: true },
        create: {
            username: 'user',
            password: hashedPasswordUser,
            role: Role.USER,
            enabled: true,
        },
    });
    console.log('Regular user created/updated.');

    // 2. Create Categories
    const defaultCategories = [
        { name: 'Допуслуги', color: '#2196F3', isDefault: true },
        { name: 'Кадры и персонал', color: '#4CAF50', isDefault: true },
        { name: 'Бухгалтерия', color: '#FF9800', isDefault: true },
        { name: 'Прочее', color: '#9E9E9E', isDefault: true },
    ];

    for (const category of defaultCategories) {
        await prisma.category.upsert({
            where: { name: category.name },
            update: {},
            create: category,
        });
    }
    console.log('Default categories created/updated.');
    const staffCategory = await prisma.category.findUnique({ where: { name: 'Кадры и персонал' } });

    if (!staffCategory) {
        console.error('Staff category not found!');
        return;
    }

    // 3. Create Documents
    const doc1 = await prisma.document.upsert({
        where: { hash: 'hash_regular_doc_1' },
        update: {},
        create: {
            title: 'Общий приказ о отпусках',
            content: 'Содержание общего приказа о отпусках...',
            filePath: '/path/to/regular_doc.docx',
            fileName: 'regular_doc.docx',
            fileSize: 12345,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            hash: 'hash_regular_doc_1',
            authorId: admin.id,
            categories: {
                create: [{ categoryId: staffCategory.id }],
            },
        },
    });
    console.log('Regular document created.');

    const confidentialDoc = await prisma.document.upsert({
        where: { hash: 'hash_confidential_doc_1' },
        update: {},
        create: {
            title: 'Личное дело сотрудника Иванова',
            content: 'Конфиденциальная информация о сотруднике Иванове...',
            filePath: '/path/to/confidential_doc.docx',
            fileName: 'confidential_doc.docx',
            fileSize: 54321,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            hash: 'hash_confidential_doc_1',
            authorId: admin.id,
            isConfidential: true,
            categories: {
                create: [{ categoryId: staffCategory.id }],
            },
        },
    });
    console.log('Confidential document created.');

    const secretAccessCode = 'secret123';
    const hashedSecretCode = await bcrypt.hash(secretAccessCode, 10);
    await prisma.document.upsert({
        where: { hash: 'hash_secret_doc_1' },
        update: {},
        create: {
            title: 'Протокол заседания совета директоров',
            content: 'Секретный протокол...',
            filePath: '/path/to/secret_doc.docx',
            fileName: 'secret_doc.docx',
            fileSize: 67890,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            hash: 'hash_secret_doc_1',
            authorId: admin.id,
            isSecret: true,
            accessCodeHash: hashedSecretCode,
            categories: {
                create: [{ categoryId: staffCategory.id }],
            },
        },
    });
    console.log('Secret document created.');

    // 4. Create Access Rights
    await prisma.confidentialDocumentAccess.upsert({
        where: {
            userId_documentId: {
                userId: user.id,
                documentId: confidentialDoc.id,
            },
        },
        update: {},
        create: {
            userId: user.id,
            documentId: confidentialDoc.id,
        },
    });
    console.log(`Access to confidential document granted for user: ${user.username}`);


    console.log('Seeding finished successfully.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });