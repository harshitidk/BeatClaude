import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

// POST /api/assessments/[id]/generate-invite
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



        const body = await request.json().catch(() => ({}));
        const expiresInHours = body.expires_in_hours || 168; // 7 days default
        const singleUse = body.single_use !== false;

        // Generate cryptographically random token (128 bits)
        const token = randomBytes(16).toString('hex');

        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        const invite = await prisma.invite.create({
            data: {
                assessmentId,
                token,
                expiresAt,
                singleUse,
                createdBy: auth.user.userId,
            },
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                actorId: auth.user.userId,
                action: 'invite.generated',
                payload: JSON.stringify({ inviteId: invite.id, assessmentId, expiresAt: expiresAt.toISOString() }),
            },
        });

        // Build the invite URL
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const inviteUrl = `${protocol}://${host}/test/invite?token=${token}`;

        return NextResponse.json({
            id: invite.id,
            token: invite.token,
            url: inviteUrl,
            expires_at: invite.expiresAt.toISOString(),
            single_use: invite.singleUse,
            created_at: invite.createdAt.toISOString(),
        });
    } catch {
        return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 });
    }
}
