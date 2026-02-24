import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// POST /api/assessments/[id]/reorder — reorder questions within a stage
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

        if (assessment.status !== 'draft') {
            return NextResponse.json({ error: 'Cannot reorder on a published assessment' }, { status: 403 });
        }

        const body = await request.json();
        const { stage_index, new_order } = body;

        if (!stage_index || !Array.isArray(new_order)) {
            return NextResponse.json({ error: 'stage_index and new_order are required' }, { status: 400 });
        }

        // Verify all question IDs belong to this stage
        const stageQuestions = await prisma.question.findMany({
            where: { assessmentId, stageIndex: stage_index },
        });

        const stageQIds = new Set(stageQuestions.map(q => q.id));
        for (const qid of new_order) {
            if (!stageQIds.has(qid)) {
                return NextResponse.json(
                    { error: `Question ${qid} does not belong to stage ${stage_index}` },
                    { status: 400 }
                );
            }
        }

        if (new_order.length !== stageQuestions.length) {
            return NextResponse.json(
                { error: `new_order must contain exactly ${stageQuestions.length} question IDs` },
                { status: 400 }
            );
        }

        // Update positions
        for (let i = 0; i < new_order.length; i++) {
            await prisma.question.update({
                where: { id: new_order[i] },
                data: { positionInStage: i + 1 },
            });
        }

        // Audit
        await prisma.auditLog.create({
            data: {
                actorId: auth.user.userId,
                action: 'assessment.reordered',
                payload: JSON.stringify({ assessmentId, stage_index, new_order }),
            },
        });

        return NextResponse.json({ success: true, stage_index, new_order });
    } catch {
        return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
    }
}
