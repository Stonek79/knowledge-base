import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Проверяем, существует ли уже администратор
    const existingAdmin = await prisma.user.findFirst({
        where: { username: 'admin' },
    });

    if (existingAdmin) {
        console.log('Admin user already exists');
        return;
    }

    // Хешируем пароль
    const hashedPasswordAdmin = await bcrypt.hash('adminpassword', 10);

    // Создаем администратора
    await prisma.user.create({
        data: {
            username: 'admin',
            password: hashedPasswordAdmin,
            role: Role.ADMIN,
        },
    });

    // Создаем пользователя
    const hashedPasswordUser = await bcrypt.hash('userpassword', 10);
    await prisma.user.create({
        data: {
            username: 'user',
            password: hashedPasswordUser,
            role: Role.USER,
        },
    });

    // Создаем гостя
    const hashedPasswordGuest = await bcrypt.hash('guestpassword', 10);
    await prisma.user.upsert({
        where: { username: 'guest' },
        update: {},
        create: {
            username: 'guest',
            password: hashedPasswordGuest,
            role: Role.GUEST,
        },
    });

    // Создаем дефолтные категории
    const defaultCategories = [
        { name: 'Допуслуги', color: '#2196F3', isDefault: true },
        {
            name: 'Кадры и персонал',
            color: '#4CAF50',
            isDefault: true,
        },
        { name: 'Бухгалтерия', color: '#FF9800', isDefault: true },
        { name: 'Прочее', color: '#FF9800', isDefault: true },
    ];

    for (const category of defaultCategories) {
        await prisma.category.upsert({
            where: { name: category.name },
            update: {},
            create: category,
        });
    }

    console.log('Created successfully');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
