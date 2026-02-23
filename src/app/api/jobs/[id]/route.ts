import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    try {
        const job = await prisma.job.findFirst({
            where: {
                id,
                createdBy: auth.user.userId, // Enforce ownership
            },
        });

        if (!job) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: job.id,
            title: job.title,
            status: job.status,
            created_at: job.createdAt.toISOString(),
            last_activity_at: job.lastActivityAt.toISOString(),
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch job' },
            { status: 500 }
        );
    }
}
