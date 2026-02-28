import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// POST /api/assessments/[id]/publish
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id: assessmentId } = await params;
    const body = await request.json().catch(() => ({}));
    const durationSeconds = body.durationSeconds ? parseInt(body.durationSeconds, 10) : null;

    try {
        const assessment = await prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                job: { select: { createdBy: true } },
                questions: true,
            },
        });

        if (!assessment || assessment.job.createdBy !== auth.user.userId) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        if (assessment.status !== 'draft') {
            return NextResponse.json({ error: 'Assessment is already published or closed' }, { status: 403 });
        }

        // Validation: 12 questions
        if (assessment.questions.length !== 12) {
            return NextResponse.json(
                { error: `Assessment requires exactly 12 questions, has ${assessment.questions.length}` },
                { status: 422 }
            );
        }

        // Validation: duration
        const finalDuration = durationSeconds || assessment.durationSeconds;
        if (finalDuration < 600) {
            return NextResponse.json(
                { error: 'Assessment duration must be at least 600 seconds (10 minutes)' },
                { status: 422 }
            );
        }

        // Validate all 3 stages have 4 questions
        for (let stage = 1; stage <= 3; stage++) {
            const count = assessment.questions.filter(q => q.stageIndex === stage).length;
            if (count !== 4) {
                return NextResponse.json(
                    { error: `Stage ${stage} has ${count} questions, needs exactly 4` },
                    { status: 422 }
                );
            }
        }

        // Publish
        const now = new Date();
        await prisma.assessment.update({
            where: { id: assessmentId },
            data: {
                status: 'active',
                publishedAt: now,
                durationSeconds: finalDuration
            },
        });

        // Mark the parent job as active too!
        await prisma.job.update({
            where: { id: assessment.jobId },
            data: { status: 'active' }
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                actorId: auth.user.userId,
                action: 'assessment.published',
                payload: JSON.stringify({ assessmentId, publishedAt: now.toISOString() }),
            },
        });

        return NextResponse.json({
            success: true,
            status: 'active',
            published_at: now.toISOString(),
        });
    } catch {
        return NextResponse.json({ error: 'Failed to publish assessment' }, { status: 500 });
    }
}
