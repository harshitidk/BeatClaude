import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// POST /api/assessments/[id]/questions/[qid] — edit a question (draft only)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; qid: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id: assessmentId, qid: questionId } = await params;

    try {
        // Verify assessment ownership and draft status
        const assessment = await prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: { job: { select: { createdBy: true } } },
        });

        if (!assessment || assessment.job.createdBy !== auth.user.userId) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        if (assessment.status === 'closed') {
            return NextResponse.json(
                { error: 'Cannot edit questions on a closed assessment' },
                { status: 403 }
            );
        }

        const body = await request.json();

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (body.prompt_text !== undefined) updateData.promptText = body.prompt_text;
        if (body.options !== undefined) updateData.options = JSON.stringify(body.options);
        if (body.char_limit !== undefined) updateData.charLimit = body.char_limit;
        if (body.question_type !== undefined) updateData.questionType = body.question_type;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const question = await prisma.question.update({
            where: { id: questionId },
            data: updateData,
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                actorId: auth.user.userId,
                action: 'question.edited',
                payload: JSON.stringify({ assessmentId, questionId, changes: Object.keys(updateData) }),
            },
        });

        return NextResponse.json({
            id: question.id,
            question_type: question.questionType,
            prompt_text: question.promptText,
            options: JSON.parse(question.options),
            char_limit: question.charLimit,
            updated_at: question.updatedAt.toISOString(),
        });
    } catch {
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
}
