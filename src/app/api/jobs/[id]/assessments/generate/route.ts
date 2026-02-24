import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { generateAssessment } from '@/lib/assessment-ai';
import { v4 as uuidv4 } from 'uuid';

// POST /api/jobs/[id]/assessments/generate
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id: jobId } = await params;

    try {
        // Parse request body
        const body = await request.json().catch(() => ({}));
        const durationSeconds = body.duration_seconds || 1800;
        const activeFrom = body.active_from ? new Date(body.active_from) : null;
        const activeUntil = body.active_until ? new Date(body.active_until) : null;
        const singleUseMagicLink = body.single_use_magic_link !== false;

        // Verify job ownership
        const job = await prisma.job.findFirst({
            where: { id: jobId, createdBy: auth.user.userId },
            include: { parsedSchema: true },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Check parsed schema exists
        if (!job.parsedSchema) {
            return NextResponse.json(
                { error: 'Job has no parsed schema. Run /jobs/{id}/parse first.' },
                { status: 422 }
            );
        }

        // Parse schema fields to build the LLM input
        const parsedSchema = {
            function: job.parsedSchema.function,
            role_family: job.parsedSchema.roleFamily,
            seniority: job.parsedSchema.seniority,
            decision_context: job.parsedSchema.decisionContext,
            core_competencies: JSON.parse(job.parsedSchema.competencies || '[]'),
            tools: JSON.parse(job.parsedSchema.tooling || '[]'),
            constraints: JSON.parse(job.parsedSchema.constraints || '[]'),
            confidence_score: job.parsedSchema.confidence,
        };

        // Generate assessment via LLM
        const { assessment: generated, validation, rawResponse } = await generateAssessment(parsedSchema);

        if (!validation.valid) {
            return NextResponse.json(
                {
                    error: 'Generated assessment failed validation',
                    validation_errors: validation.errors,
                    raw_output: rawResponse,
                },
                { status: 422 }
            );
        }

        // Create assessment and questions in database
        const assessmentId = uuidv4();

        await prisma.assessment.create({
            data: {
                id: assessmentId,
                jobId,
                status: 'draft',
                durationSeconds,
                activeFrom,
                activeUntil,
                singleUseMagicLink,
                rawGenerationOutput: rawResponse,
            },
        });

        // Create questions
        for (const stage of generated.stages) {
            for (let i = 0; i < stage.questions.length; i++) {
                const q = stage.questions[i];
                await prisma.question.create({
                    data: {
                        id: uuidv4(),
                        assessmentId,
                        stageIndex: stage.stage_index,
                        positionInStage: i + 1,
                        questionType: q.question_type,
                        promptText: q.prompt_text,
                        options: JSON.stringify(q.options || []),
                        charLimit: q.char_limit || null,
                        scoringHint: q.scoring_hint || '',
                        internalIntent: q.internal_intent,
                    },
                });
            }
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                actorId: auth.user.userId,
                action: 'assessment.generated',
                payload: JSON.stringify({ assessmentId, jobId, questionCount: 16 }),
            },
        });

        // Fetch and return full assessment
        const assessment = await prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                questions: { orderBy: [{ stageIndex: 'asc' }, { positionInStage: 'asc' }] },
            },
        });

        // Group questions by stage
        const stages = [1, 2, 3, 4].map(stageIndex => ({
            stage_index: stageIndex,
            questions: (assessment?.questions ?? [])
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
                })),
        }));

        return NextResponse.json({
            id: assessment?.id,
            job_id: assessment?.jobId,
            status: assessment?.status,
            duration_seconds: assessment?.durationSeconds,
            active_from: assessment?.activeFrom?.toISOString() || null,
            active_until: assessment?.activeUntil?.toISOString() || null,
            stages,
            created_at: assessment?.createdAt.toISOString(),
        });
    } catch (err) {
        console.error('Assessment generation error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to generate assessment' },
            { status: 500 }
        );
    }
}
