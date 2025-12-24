
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module'; // Adjust path
import { RequirementsService } from '../src/requirements/requirements.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
    console.log('Initializing Nest Application Context...');
    const app = await NestFactory.createApplicationContext(AppModule);

    const requirementsService = app.get(RequirementsService);
    const prisma = app.get(PrismaService);

    // Mock User for creation (assuming seed or existing user)
    // We need a valid user ID. Let's create a temp one if needed or find one.
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'test-user@example.com',
                name: 'Test User',
                password: 'password', // Insecure but for test
                role: 'ADMIN'
            }
        });
    }

    console.log('Testing Requirement Creation...');

    const input = {
        title: 'Bank Application Login',
        content: 'User should contain ability to log in with secure password and face id.',
        userId: user.id,
        code: `TEST-REQ-${Date.now()}` // Unique code
    };

    try {
        const createdReq = await requirementsService.create(input);
        console.log('Requirement Created:', createdReq.id);
        console.log('Standardized Title:', createdReq.title);
        console.log('Standardized Content:', createdReq.content);

        const reqWithCategories = await prisma.requirement.findUnique({
            where: { id: createdReq.id },
            include: { categories: true }
        });

        console.log('Categories:', reqWithCategories?.categories.map(c => `${c.level}: ${c.name}`).join(', '));

        if (reqWithCategories?.categories.some(c => c.code === 'IND-FIN')) {
            console.log('SUCCESS: Correctly classified as Finance');
        } else {
            console.warn('WARNING: Classification might be off.');
        }

    } catch (error) {
        console.error('Error creating requirement:', error);
    } finally {
        await app.close();
    }
}

main();
