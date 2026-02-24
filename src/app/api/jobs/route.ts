import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();
        const { description, title: explicitTitle } = body;

        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return NextResponse.json(
                { error: 'Job description is required' },
                { status: 400 }
            );
        }

        // Use explicit title if provided, otherwise extract from first line of description
        const title = explicitTitle?.trim() || description.trim().split('\n')[0].slice(0, 100);

        const job = await prisma.job.create({
            data: {
                title,
                rawJd: description.trim(),
                createdBy: auth.user.userId,
                status: 'draft',
            },
        });

        return NextResponse.json(
            {
                id: job.id,
                title: job.title,
                status: job.status,
                created_at: job.createdAt.toISOString(),
                last_activity_at: job.lastActivityAt.toISOString(),
            },
            { status: 201 }
        );
    } catch (err) {
        console.error('Failed to create job:', err);
        return NextResponse.json(
            { error: 'Failed to create job' },
            { status: 500 }
        );
    }
}
