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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    try {
        // Verify ownership
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

        // Find all assessments to cascade delete their relations
        const assessments = await prisma.assessment.findMany({ where: { jobId: id }, select: { id: true } });
        const assessmentIds = assessments.map(a => a.id);

        if (assessmentIds.length > 0) {
            const instances = await prisma.testInstance.findMany({ where: { assessmentId: { in: assessmentIds } }, select: { id: true } });
            const instanceIds = instances.map(i => i.id);

            if (instanceIds.length > 0) {
                await prisma.answer.deleteMany({ where: { instanceId: { in: instanceIds } } });
            }

            await prisma.testInstance.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
            await prisma.invite.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
            await prisma.question.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
            await prisma.assessment.deleteMany({ where: { jobId: id } });
        }

        await prisma.candidateSubmission.deleteMany({ where: { jobId: id } });
        await prisma.parsedSchema.deleteMany({ where: { jobId: id } });

        // Delete the job
        await prisma.job.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: 'Failed to delete job' },
            { status: 500 }
        );
    }
}
