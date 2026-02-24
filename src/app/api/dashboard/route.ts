import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
        const jobs = await prisma.job.findMany({
            where: { createdBy: auth.user.userId },
            include: {
                _count: {
                    select: { submissions: true },
                },
                parsedSchema: {
                    select: {
                        roleFamily: true,
                        seniority: true,
                        function: true,
                    },
                },
                assessments: {
                    select: { id: true },
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({
            jobs: jobs.map((job) => ({
                id: job.id,
                title: job.title,
                role_family: job.parsedSchema?.roleFamily || '',
                seniority: job.parsedSchema?.seniority || '',
                job_function: job.parsedSchema?.function || '',
                has_parsed_schema: !!job.parsedSchema,
                status: job.status,
                submitted_count: job._count.submissions,
                assessment_id: job.assessments.length > 0 ? job.assessments[0].id : null,
                last_activity_at: job.lastActivityAt.toISOString(),
                created_at: job.createdAt.toISOString(),
            })),
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
