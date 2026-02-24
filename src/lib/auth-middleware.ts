import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export interface AuthenticatedUser {
    userId: string;
    email: string;
}

/**
 * Extracts and verifies JWT from Authorization header.
 * Returns the authenticated user or a 401 response.
 */
export async function authenticateRequest(
    request: NextRequest
): Promise<{ user: AuthenticatedUser } | { error: NextResponse }> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            error: NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            ),
        };
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded) {
        return {
            error: NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            ),
        };
    }

    // Update last login and implicitly verify user still exists in DB
    try {
        await prisma.user.update({
            where: { id: decoded.userId },
            data: { lastLoginAt: new Date() },
        });
    } catch {
        // User not found in database or other db error
        return {
            error: NextResponse.json(
                { error: 'User does not exist or session invalid' },
                { status: 401 }
            ),
        };
    }

    return { user: decoded };
}
