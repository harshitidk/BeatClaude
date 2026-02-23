import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create HR user
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'hr@beatclaude.com' },
        update: {},
        create: {
            email: 'hr@beatclaude.com',
            passwordHash,
        },
    });
    console.log(`✓ User: ${user.email} (id: ${user.id})`);

    // Create jobs with various statuses
    const jobsData = [
        { title: 'Senior AI Engineer', status: 'active', daysAgo: 11, submissions: 24 },
        { title: 'Technical Recruiter', status: 'draft', daysAgo: 13, submissions: 0 },
        { title: 'Product Designer', status: 'closed', daysAgo: 45, submissions: 86 },
        { title: 'Backend Developer', status: 'active', daysAgo: 9, submissions: 12 },
        { title: 'Marketing Lead', status: 'active', daysAgo: 8, submissions: 5 },
    ];

    for (const jobData of jobsData) {
        const createdAt = new Date(Date.now() - jobData.daysAgo * 24 * 60 * 60 * 1000);
        const lastActivity = new Date(Date.now() - Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000);

        const job = await prisma.job.create({
            data: {
                title: jobData.title,
                createdBy: user.id,
                status: jobData.status,
                createdAt,
                lastActivityAt: lastActivity,
            },
        });

        // Create dummy submissions
        for (let i = 0; i < jobData.submissions; i++) {
            await prisma.candidateSubmission.create({
                data: {
                    jobId: job.id,
                    submittedAt: new Date(
                        createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())
                    ),
                },
            });
        }

        console.log(`✓ Job: ${jobData.title} (${jobData.status}, ${jobData.submissions} submissions)`);
    }

    console.log('\n✅ Seed complete!');
    console.log('Login with: hr@beatclaude.com / password123');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
