import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// GET /api/jobs/[id]/results — list submissions and stage summaries
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id: jobId } = await params;

    try {
        const job = await prisma.job.findFirst({
            where: { id: jobId, createdBy: auth.user.userId },
            include: {
                assessments: {
                    include: {
                        testInstances: {
                            where: { status: 'submitted' },
                            orderBy: { completedAt: 'desc' },
                        },
                    },
                },
            },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Flatten all test instances across assessments
        const submissions = job.assessments.flatMap(a =>
            a.testInstances.map(inst => ({
                id: inst.id,
                assessment_id: a.id,
                candidate_identifier: inst.candidateIdentifier,
                started_at: inst.startedAt?.toISOString(),
                completed_at: inst.completedAt?.toISOString(),
                time_taken_seconds: inst.timeTakenSeconds,
                scoring_status: inst.scoringStatus,
                recommendation: inst.recommendation || null,
                hr_override: inst.hrOverride || null,
            }))
        );

        return NextResponse.json({
            job_id: jobId,
            job_title: job.title,
            total_submissions: submissions.length,
            submissions,
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
    }
}
