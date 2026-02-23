import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string> = {
    draft: 'active',
    active: 'closed',
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    try {
        const body = await request.json();
        const { status: newStatus } = body;

        if (!newStatus || !['active', 'closed'].includes(newStatus)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be "active" or "closed"' },
                { status: 400 }
            );
        }

        // Fetch current job (enforce ownership)
        const job = await prisma.job.findFirst({
            where: {
                id,
                createdBy: auth.user.userId,
            },
        });

        if (!job) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        // Validate state transition
        const allowedNext = VALID_TRANSITIONS[job.status];
        if (allowedNext !== newStatus) {
            return NextResponse.json(
                {
                    error: `Invalid transition: cannot move from "${job.status}" to "${newStatus}". Allowed: ${allowedNext ? `"${job.status}" → "${allowedNext}"` : 'none (terminal state)'
                        }`,
                },
                { status: 422 }
            );
        }

        // Update status
        const updated = await prisma.job.update({
            where: { id },
            data: {
                status: newStatus,
                lastActivityAt: new Date(),
            },
        });

        return NextResponse.json({
            id: updated.id,
            title: updated.title,
            status: updated.status,
            last_activity_at: updated.lastActivityAt.toISOString(),
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to update job status' },
            { status: 500 }
        );
    }
}
