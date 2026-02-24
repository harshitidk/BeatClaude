import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/test/[instanceId]/questions?stage=N
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ instanceId: string }> }
) {
    const { instanceId } = await params;
    const stageParam = request.nextUrl.searchParams.get('stage');
    const stage = stageParam ? parseInt(stageParam, 10) : null;

    if (!stage || stage < 1 || stage > 4) {
        return NextResponse.json({ error: 'stage must be 1-4' }, { status: 400 });
    }

    try {
        const instance = await prisma.testInstance.findUnique({
            where: { id: instanceId },
            include: {
                assessment: {
                    include: {
                        questions: {
                            where: { stageIndex: stage },
                            orderBy: { positionInStage: 'asc' },
                        },
                    },
                },
            },
        });

        if (!instance) {
            return NextResponse.json({ error: 'Test instance not found' }, { status: 404 });
        }

        if (instance.status === 'submitted') {
            return NextResponse.json({ error: 'Test has already been submitted' }, { status: 403 });
        }

        // Enforce stage boundaries: candidate can't access future stages
        if (stage > instance.currentStage) {
            return NextResponse.json(
                { error: `You must complete stage ${instance.currentStage} before accessing stage ${stage}` },
                { status: 403 }
            );
        }

        const questions = instance.assessment.questions.map(q => ({
            id: q.id,
            position: q.positionInStage,
            question_type: q.questionType,
            prompt_text: q.promptText,
            options: JSON.parse(q.options),
            char_limit: q.charLimit,
        }));

        // Also get existing answers for this stage (for autosave recovery)
        const questionIds = instance.assessment.questions.map(q => q.id);
        const existingAnswers = await prisma.answer.findMany({
            where: {
                instanceId,
                questionId: { in: questionIds },
            },
        });

        const answers = existingAnswers.map(a => ({
            question_id: a.questionId,
            answer_text: a.answerText,
            selected_option_id: a.selectedOptionId,
        }));

        return NextResponse.json({
            instance_id: instanceId,
            current_stage: instance.currentStage,
            stage,
            questions,
            existing_answers: answers,
            duration_seconds: instance.assessment.durationSeconds,
            started_at: instance.startedAt?.toISOString(),
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }
}
