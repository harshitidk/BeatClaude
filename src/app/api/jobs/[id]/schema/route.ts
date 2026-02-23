import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    try {
        // Verify ownership
        const job = await prisma.job.findFirst({
            where: { id, createdBy: auth.user.userId },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Get parsed schema
        const schema = await prisma.parsedSchema.findUnique({
            where: { jobId: id },
        });

        if (!schema) {
            return NextResponse.json({ error: 'No parsed schema found' }, { status: 404 });
        }

        return NextResponse.json({
            parsed: {
                function: schema.function,
                role_family: schema.roleFamily,
                seniority: schema.seniority,
                decision_context: schema.decisionContext,
                core_competencies: JSON.parse(schema.competencies),
                tools: JSON.parse(schema.tooling),
                constraints: JSON.parse(schema.constraints),
                confidence_score: schema.confidence,
            },
            validation: {
                valid: schema.isValid,
                errors: JSON.parse(schema.validationErrors),
                warnings: JSON.parse(schema.validationWarnings),
            },
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch schema' },
            { status: 500 }
        );
    }
}
