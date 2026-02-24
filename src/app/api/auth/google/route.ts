import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateToken, hashPassword } from '@/lib/auth';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

const client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { credential } = body;

        if (!credential) {
            return NextResponse.json(
                { error: 'Google credential is required' },
                { status: 400 }
            );
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return NextResponse.json(
                { error: 'Invalid Google credential' },
                { status: 400 }
            );
        }

        const email = payload.email.toLowerCase().trim();

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Create user
            // We use a dummy hash since that they are logging in securely with google
            const passwordHash = await hashPassword(uuidv4());
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                },
            });
        }

        const token = generateToken(user.id, user.email);

        return NextResponse.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, createdAt: user.createdAt },
        });

    } catch (error) {
        console.error("Google Auth error", error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
