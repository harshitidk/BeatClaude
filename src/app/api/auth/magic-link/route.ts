import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        // Validation
        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Check if user exists — respond with success either way to prevent email enumeration
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            return NextResponse.json({ message: 'If an account exists, a magic link has been sent' });
        }

        // Generate and store magic link token (15 minute expiry)
        const token = uuidv4();
        await prisma.magicLinkToken.create({
            data: {
                email: email.toLowerCase().trim(),
                token,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });

        // In production, send email. For MVP, log to console.
        console.log(`\n🔗 MAGIC LINK for ${email}:`);
        console.log(`   http://localhost:3000/api/auth/magic-link/verify?token=${token}`);
        console.log(`   (This would be emailed in production)\n`);

        return NextResponse.json({
            message: 'Magic link sent successfully',
            ...(process.env.NODE_ENV === 'development' && { devToken: token }),
        });
    } catch {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
