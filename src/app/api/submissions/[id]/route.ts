import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/submissions/[id] — full submission detail with scores
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id: instanceId } = await params;

    try {
        const instance = await prisma.testInstance.findUnique({
            where: { id: instanceId },
            include: {
                answers: {
                    include: { question: true },
                    orderBy: { question: { stageIndex: 'asc' } },
                },
                assessment: {
                    include: {
                        job: { select: { createdBy: true, title: true } },
                    },
                },
            },
        });

        if (!instance || instance.assessment.job.createdBy !== auth.user.userId) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Parse scoring result if available
        let scoringBreakdown = null;
        if (instance.scoringResult) {
            try {
                scoringBreakdown = JSON.parse(instance.scoringResult);
            } catch {
                // If it's raw text, return as-is
                scoringBreakdown = { raw: instance.scoringResult };
            }
        }

        const answersGrouped = [1, 2, 3, 4].map(stage => ({
            stage_index: stage,
            answers: instance.answers
                .filter(a => a.question.stageIndex === stage)
                .sort((a, b) => a.question.positionInStage - b.question.positionInStage)
                .map(a => ({
                    question_id: a.questionId,
                    question_type: a.question.questionType,
                    prompt_text: a.question.promptText,
                    options: JSON.parse(a.question.options),
                    answer_text: a.answerText,
                    selected_option_id: a.selectedOptionId,
                    submitted_at: a.submittedAt.toISOString(),
                })),
        }));

        return NextResponse.json({
            id: instance.id,
            job_title: instance.assessment.job.title,
            candidate_identifier: instance.candidateIdentifier,
            candidate_email: instance.candidateEmail,
            status: instance.status,
            started_at: instance.startedAt?.toISOString(),
            completed_at: instance.completedAt?.toISOString(),
            time_taken_seconds: instance.timeTakenSeconds,
            scoring_status: instance.scoringStatus,
            recommendation: instance.recommendation || null,
            hr_override: instance.hrOverride || null,
            scoring_breakdown: scoringBreakdown,
            stages: answersGrouped,
            raw_scoring_output: instance.scoringResult || null,
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
    }
}

// POST /api/submissions/[id] — HR override recommendation
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id: instanceId } = await params;

    try {
        const instance = await prisma.testInstance.findUnique({
            where: { id: instanceId },
            include: {
                assessment: {
                    include: { job: { select: { createdBy: true } } },
                },
            },
        });

        if (!instance || instance.assessment.job.createdBy !== auth.user.userId) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const body = await request.json();
        const { recommendation } = body;

        if (!['Advance', 'Hold', 'Reject'].includes(recommendation)) {
            return NextResponse.json(
                { error: 'recommendation must be Advance, Hold, or Reject' },
                { status: 400 }
            );
        }

        await prisma.testInstance.update({
            where: { id: instanceId },
            data: { hrOverride: recommendation },
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                actorId: auth.user.userId,
                action: 'submission.override',
                payload: JSON.stringify({ instanceId, recommendation }),
            },
        });

        return NextResponse.json({ success: true, hr_override: recommendation });
    } catch {
        return NextResponse.json({ error: 'Failed to override' }, { status: 500 });
    }
}
