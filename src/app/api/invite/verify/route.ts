import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/invite/verify?token=XXXX — validate token and active window
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    try {
        const invite = await prisma.invite.findUnique({
            where: { token },
            include: {
                assessment: {
                    include: {
                        job: { select: { title: true } },
                    },
                },
            },
        });

        if (!invite) {
            return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
        }

        // Check expiry
        if (new Date() > invite.expiresAt) {
            return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
        }

        // Check single-use
        if (invite.singleUse && invite.usedAt) {
            return NextResponse.json({ error: 'This invite link has already been used' }, { status: 410 });
        }

        // Check assessment active
        if (invite.assessment.status !== 'active') {
            return NextResponse.json({ error: 'This assessment is no longer active' }, { status: 403 });
        }

        // Check active window
        const now = new Date();
        if (invite.assessment.activeFrom && now < invite.assessment.activeFrom) {
            return NextResponse.json({ error: 'This assessment is not yet available' }, { status: 403 });
        }
        if (invite.assessment.activeUntil && now > invite.assessment.activeUntil) {
            return NextResponse.json({ error: 'This assessment window has closed' }, { status: 403 });
        }

        return NextResponse.json({
            valid: true,
            assessment: {
                id: invite.assessment.id,
                job_title: invite.assessment.job.title,
                duration_seconds: invite.assessment.durationSeconds,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Failed to verify invite' }, { status: 500 });
    }
}
