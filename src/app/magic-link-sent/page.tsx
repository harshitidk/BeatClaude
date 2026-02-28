'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';

function MagicLinkSentContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || 'your email';
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    const handleResend = async () => {
        setResending(true);
        try {
            await fetch('/api/auth/magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            setResent(true);
            setTimeout(() => setResent(false), 3000);
        } catch {
            // silently fail on resend
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
            <div className="w-full max-w-[400px]">
                {/* Card */}
                <div className="rounded-2xl bg-white p-10 shadow-lg shadow-gray-200/50 text-center">
                    {/* Mail Icon */}
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-8 w-8 text-emerald-600"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                            />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Check your inbox</h1>

                    <p className="mt-3 text-sm leading-relaxed text-gray-500">
                        A secure link has been sent. Click the link in the email to sign in instantly.
                    </p>

                    {/* Resend */}
                    <div className="mt-8">
                        <p className="text-sm text-gray-400">Didn&apos;t receive the email?</p>
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="mt-1 text-sm font-semibold text-gray-900 underline underline-offset-4 decoration-gray-400 hover:decoration-gray-900 disabled:opacity-50 transition-colors"
                        >
                            {resending ? 'Sending...' : resent ? 'Link sent!' : 'Resend link'}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="my-6 h-px bg-gray-100" />

                    {/* Back to sign in */}
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="h-4 w-4"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Back to sign in
                    </Link>
                </div>

                {/* Secure badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium tracking-widest text-gray-400">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-4 w-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                        />
                    </svg>
                    SECURE AUTHENTICATION
                </div>
            </div>
        </div>
    );
}

export default function MagicLinkSentPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
        }>
            <MagicLinkSentContent />
        </Suspense>
    );
}
