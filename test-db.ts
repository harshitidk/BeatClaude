import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log("Users in DB:", users);

    const jobs = await prisma.job.findMany();
    console.log("Jobs in DB:", jobs);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
