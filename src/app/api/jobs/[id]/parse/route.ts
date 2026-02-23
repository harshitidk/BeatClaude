import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { dissectJD } from '@/lib/gemini';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    try {
        // Verify ownership and get rawJd
        const job = await prisma.job.findFirst({
            where: { id, createdBy: auth.user.userId },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        if (!job.rawJd || job.rawJd.trim().length === 0) {
            return NextResponse.json(
                { error: 'No job description to parse' },
                { status: 400 }
            );
        }

        // Check if already parsed — delete old result for re-parse
        await prisma.parsedSchema.deleteMany({ where: { jobId: id } });

        // Call Gemini
        const { parsed, validation, rawResponse } = await dissectJD(job.rawJd);

        // Store parsed schema
        const schema = await prisma.parsedSchema.create({
            data: {
                jobId: id,
                function: parsed.function,
                roleFamily: parsed.role_family || '',
                seniority: parsed.seniority,
                competencies: JSON.stringify(parsed.core_competencies),
                tooling: JSON.stringify(parsed.tools),
                decisionContext: parsed.decision_context || '',
                constraints: JSON.stringify(parsed.constraints || []),
                confidence: parsed.confidence_score,
                rawResponse,
                validationErrors: JSON.stringify(validation.errors),
                validationWarnings: JSON.stringify(validation.warnings),
                isValid: validation.valid,
            },
        });

        // Update job title from role_family if it was auto-generated from first line
        if (parsed.role_family) {
            await prisma.job.update({
                where: { id },
                data: { lastActivityAt: new Date() },
            });
        }

        return NextResponse.json({
            id: schema.id,
            jobId: id,
            parsed: {
                function: parsed.function,
                role_family: parsed.role_family,
                seniority: parsed.seniority,
                decision_context: parsed.decision_context,
                core_competencies: parsed.core_competencies,
                tools: parsed.tools,
                constraints: parsed.constraints,
                confidence_score: parsed.confidence_score,
            },
            validation: {
                valid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings,
            },
        });
    } catch (err) {
        console.error('JD parse error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to parse job description' },
            { status: 500 }
        );
    }
}
