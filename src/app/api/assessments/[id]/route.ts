import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/assessments/[id] — returns assessment with questions grouped by stage
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    try {
        const assessment = await prisma.assessment.findUnique({
            where: { id },
            include: {
                questions: { orderBy: [{ stageIndex: 'asc' }, { positionInStage: 'asc' }] },
                job: { select: { id: true, title: true, createdBy: true, rawJd: true } },
            },
        });

        if (!assessment || assessment.job.createdBy !== auth.user.userId) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        const stages = [1, 2, 3, 4].map(stageIndex => ({
            stage_index: stageIndex,
            questions: assessment.questions
                .filter(q => q.stageIndex === stageIndex)
                .map(q => ({
                    id: q.id,
                    position: q.positionInStage,
                    question_type: q.questionType,
                    prompt_text: q.promptText,
                    options: JSON.parse(q.options),
                    char_limit: q.charLimit,
                    scoring_hint: q.scoringHint,
                    internal_intent: q.internalIntent,
                    updated_at: q.updatedAt.toISOString(),
                })),
        }));

        return NextResponse.json({
            id: assessment.id,
            job_id: assessment.jobId,
            job_title: assessment.job.title,
            status: assessment.status,
            duration_seconds: assessment.durationSeconds,
            active_from: assessment.activeFrom?.toISOString() || null,
            active_until: assessment.activeUntil?.toISOString() || null,
            single_use_magic_link: assessment.singleUseMagicLink,
            stages,
            created_at: assessment.createdAt.toISOString(),
            published_at: assessment.publishedAt?.toISOString() || null,
            closed_at: assessment.closedAt?.toISOString() || null,
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch assessment' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    try {
        const assessment = await prisma.assessment.findUnique({
            where: { id },
            include: { job: { select: { createdBy: true } } },
        });

        if (!assessment || assessment.job.createdBy !== auth.user.userId) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        const body = await request.json();
        const durationSeconds = body.durationSeconds ? parseInt(body.durationSeconds, 10) : undefined;

        await prisma.assessment.update({
            where: { id },
            data: {
                ...(durationSeconds !== undefined && { durationSeconds }),
            },
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
    }
}
