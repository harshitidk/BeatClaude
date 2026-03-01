import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerScoring } from '../answers/route';

// POST /api/test/[instanceId]/end — candidate ends test early
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ instanceId: string }> }
) {
    const { instanceId } = await params;

    try {
        const instance = await prisma.testInstance.findUnique({
            where: { id: instanceId },
        });

        if (!instance) {
            return NextResponse.json({ error: 'Test instance not found' }, { status: 404 });
        }

        if (instance.status === 'submitted') {
            return NextResponse.json({ error: 'Test already submitted' }, { status: 403 });
        }

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
                scoringStatus: 'pending',
            },
        });

        // Create candidate_submission for dashboard
        await prisma.candidateSubmission.create({
            data: { jobId: instance.assessmentId },
        });

        // Await scoring to prevent serverless suspension and ensure immediate analysis
        await triggerScoring(instanceId).catch(console.error);

        return NextResponse.json({
            status: 'submitted',
            message: 'Your responses have been submitted. The hiring team will review them.',
            time_taken_seconds: timeTaken,
        });
    } catch (err) {
        console.error('End test error:', err);
        return NextResponse.json({ error: 'Failed to end test' }, { status: 500 });
    }
}
