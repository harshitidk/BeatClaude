import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// POST /api/invite/[token]/start — start a test session
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const invite = await prisma.invite.findUnique({
            where: { token },
            include: {
                assessment: {
                    include: {
                        questions: {
                            where: { stageIndex: 1 },
                            orderBy: { positionInStage: 'asc' },
                        },
                        job: { select: { title: true } },
                    },
                },
            },
        });

        if (!invite) {
            return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });
        }

        // Validations
        if (new Date() > invite.expiresAt) {
            return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
        }
        if (invite.singleUse && invite.usedAt) {
            return NextResponse.json({ error: 'Invite already used' }, { status: 410 });
        }
        if (invite.assessment.status !== 'active') {
            return NextResponse.json({ error: 'Assessment not active' }, { status: 403 });
        }

        // Active window check
        const now = new Date();
        if (invite.assessment.activeFrom && now < invite.assessment.activeFrom) {
            return NextResponse.json({ error: 'Assessment not yet available' }, { status: 403 });
        }
        if (invite.assessment.activeUntil && now > invite.assessment.activeUntil) {
            return NextResponse.json({ error: 'Assessment window closed' }, { status: 403 });
        }

        // Mark invite as used
        if (invite.singleUse) {
            await prisma.invite.update({
                where: { id: invite.id },
                data: { usedAt: now },
            });
        }

        const body = await request.json().catch(() => ({}));
        const name = body.name?.trim() || 'Anonymous';
        const email = body.email?.trim() || `candidate-${uuidv4().slice(0, 8)}`;
        const ua = request.headers.get('user-agent') || 'unknown';

        const instance = await prisma.testInstance.create({
            data: {
                assessmentId: invite.assessment.id,
                inviteId: invite.id,
                candidateIdentifier: name,
                candidateEmail: email,
                startedAt: now,
                status: 'in_progress',
                currentStage: 1,
                rawSessionMeta: JSON.stringify({ ua: ua.slice(0, 200) }),
            },
        });

        // Return instance ID and stage 1 questions (no internal fields)
        const questions = invite.assessment.questions.map(q => ({
            id: q.id,
            position: q.positionInStage,
            question_type: q.questionType,
            prompt_text: q.promptText,
            options: JSON.parse(q.options),
            char_limit: q.charLimit,
        }));

        return NextResponse.json({
            instance_id: instance.id,
            assessment_id: invite.assessment.id,
            job_title: invite.assessment.job.title,
            duration_seconds: invite.assessment.durationSeconds,
            current_stage: 1,
            total_stages: 4,
            questions,
        });
    } catch (err: any) {
        console.error('Start test error:', err);
        return NextResponse.json({ error: 'Failed to start test' }, { status: 500 });
    }
}
