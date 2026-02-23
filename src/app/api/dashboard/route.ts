import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
        const jobs = await prisma.job.findMany({
            where: { createdBy: auth.user.userId },
            include: {
                _count: {
                    select: { submissions: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({
            jobs: jobs.map((job) => ({
                id: job.id,
                title: job.title,
                status: job.status,
                submitted_count: job._count.submissions,
                last_activity_at: job.lastActivityAt.toISOString(),
                created_at: job.createdAt.toISOString(),
            })),
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
