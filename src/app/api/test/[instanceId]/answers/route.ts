import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/test/[instanceId]/answers — submit answers for current stage
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ instanceId: string }> }
) {
    const { instanceId } = await params;

    try {
        const instance = await prisma.testInstance.findUnique({
            where: { id: instanceId },
            include: {
                assessment: {
                    include: { questions: { orderBy: [{ stageIndex: 'asc' }, { positionInStage: 'asc' }] } },
                },
            },
        });

        if (!instance) {
            return NextResponse.json({ error: 'Test instance not found' }, { status: 404 });
        }

        if (instance.status === 'submitted') {
            return NextResponse.json({ error: 'Test already submitted' }, { status: 403 });
        }

        const body = await request.json();
        const { answers, advance_stage } = body;

        if (!answers || !Array.isArray(answers)) {
            return NextResponse.json({ error: 'answers array is required' }, { status: 400 });
        }

        // Get current stage questions for validation
        const currentStageQuestions = instance.assessment.questions
            .filter(q => q.stageIndex === instance.currentStage);
        const validQIds = new Set(currentStageQuestions.map(q => q.id));

        // Validate and upsert answers (idempotent)
        for (const ans of answers) {
            if (!validQIds.has(ans.question_id)) {
                return NextResponse.json(
                    { error: `Question ${ans.question_id} not in current stage` },
                    { status: 400 }
                );
            }

            // Validate char limit for short_structured
            const question = currentStageQuestions.find(q => q.id === ans.question_id);
            if (question && question.charLimit && ans.answer_text) {
                if (ans.answer_text.length > question.charLimit) {
                    return NextResponse.json(
                        { error: `Answer for question ${ans.question_id} exceeds ${question.charLimit} character limit` },
                        { status: 400 }
                    );
                }
            }

            // Upsert answer (idempotent)
            await prisma.answer.upsert({
                where: {
                    instanceId_questionId: {
                        instanceId,
                        questionId: ans.question_id,
                    },
                },
                update: {
                    answerText: ans.answer_text || null,
                    selectedOptionId: ans.selected_option_id || null,
                    submittedAt: new Date(),
                },
                create: {
                    instanceId,
                    questionId: ans.question_id,
                    answerText: ans.answer_text || null,
                    selectedOptionId: ans.selected_option_id || null,
                },
            });
        }

        // If advancing to next stage or completing
        if (advance_stage) {
            const nextStage = instance.currentStage + 1;

            if (nextStage > 3) {
                // All stages completed — mark submitted
                const now = new Date();
                const timeTaken = instance.startedAt
                    ? Math.round((now.getTime() - instance.startedAt.getTime()) / 1000)
                    : null;

                await prisma.testInstance.update({
                    where: { id: instanceId },
                    data: {
                        status: 'submitted',
                        completedAt: now,
                        timeTakenSeconds: timeTaken,
                        currentStage: 3,
                        scoringStatus: 'pending',
                    },
                });

                // Create candidate_submission for dashboard counts
                await prisma.candidateSubmission.create({
                    data: { jobId: instance.assessment.jobId },
                });

                // Trigger async scoring (fire and forget)
                triggerScoring(instanceId).catch(console.error);

                return NextResponse.json({
                    status: 'submitted',
                    message: 'Your responses have been submitted. The hiring team will review them.',
                    time_taken_seconds: timeTaken,
                });
            } else {
                // Advance to next stage
                await prisma.testInstance.update({
                    where: { id: instanceId },
                    data: { currentStage: nextStage },
                });

                // Fetch next stage questions
                const nextQuestions = instance.assessment.questions
                    .filter(q => q.stageIndex === nextStage)
                    .map(q => ({
                        id: q.id,
                        position: q.positionInStage,
                        question_type: q.questionType,
                        prompt_text: q.promptText,
                        options: JSON.parse(q.options),
                        char_limit: q.charLimit,
                    }));

                return NextResponse.json({
                    status: 'in_progress',
                    current_stage: nextStage,
                    total_stages: 3,
                    questions: nextQuestions,
                });
            }
        }

        // Autosave without stage advance
        return NextResponse.json({ status: 'saved', current_stage: instance.currentStage });
    } catch (err) {
        console.error('Answer submission error:', err);
        return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
    }
}

// Async scoring helper
async function triggerScoring(instanceId: string) {
    try {
        const { scoreSubmission } = await import('@/lib/assessment-ai');

        const instance = await prisma.testInstance.findUnique({
            where: { id: instanceId },
            include: {
                answers: true,
                assessment: {
                    include: { questions: true },
                },
            },
        });

        if (!instance) return;

        await prisma.testInstance.update({
            where: { id: instanceId },
            data: { scoringStatus: 'scoring' },
        });

        const questions = instance.assessment.questions.map(q => ({
            id: q.id,
            stage: q.stageIndex,
            type: q.questionType,
            prompt: q.promptText,
            options: q.options,
        }));

        const answers = instance.answers.map(a => ({
            questionId: a.questionId,
            answerText: a.answerText || '',
            selectedOptionId: a.selectedOptionId || '',
        }));

        const { scoring, rawResponse } = await scoreSubmission(questions, answers);

        await prisma.testInstance.update({
            where: { id: instanceId },
            data: {
                scoringStatus: 'scored',
                scoringResult: rawResponse,
                recommendation: scoring.recommendation,
            },
        });
    } catch (err) {
        console.error('Scoring error:', err);
        await prisma.testInstance.update({
            where: { id: instanceId },
            data: { scoringStatus: 'error' },
        });
    }
}
