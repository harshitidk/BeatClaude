import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// POST /api/assessments/[id]/close
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id: assessmentId } = await params;

    try {
        const assessment = await prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: { job: { select: { createdBy: true } } },
        });

        if (!assessment || assessment.job.createdBy !== auth.user.userId) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        if (assessment.status === 'closed') {
            return NextResponse.json({ error: 'Assessment is already closed' }, { status: 400 });
        }

        const now = new Date();
        await prisma.assessment.update({
            where: { id: assessmentId },
            data: { status: 'closed', closedAt: now },
        });

        await prisma.auditLog.create({
            data: {
                actorId: auth.user.userId,
                action: 'assessment.closed',
                payload: JSON.stringify({ assessmentId, closedAt: now.toISOString() }),
            },
        });

        return NextResponse.json({ success: true, status: 'closed', closed_at: now.toISOString() });
    } catch {
        return NextResponse.json({ error: 'Failed to close assessment' }, { status: 500 });
    }
}
