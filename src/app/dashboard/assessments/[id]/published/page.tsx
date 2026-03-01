'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center">Loading...</div>}>
            <PublishedPage />
        </Suspense>
    );
}

function PublishedPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const assessmentId = params.id as string;
    const token = searchParams.get('token');

    const [copied, setCopied] = useState(false);
    const [inviteUrl, setInviteUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined' && token) {
            setInviteUrl(`${window.location.origin}/test/invite?token=${token}`);
        }
    }, [token]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
                <div className="text-center rounded-xl border border-red-200 bg-red-50 p-6">
                    <p className="text-sm text-red-600">Missing invite token.</p>
                    <Link href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-emerald-600">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8] items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">

                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
                    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-center text-2xl font-black text-gray-900 tracking-tight">Assessment Published!</h1>
                <p className="mt-2 text-center text-sm text-gray-500">
                    Your 12-question generated assessment is now active and ready for candidates. Share the magic link below.
                </p>

                <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Candidate Magic Link (Single-Use)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={inviteUrl}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-600 outline-none selection:bg-emerald-100 placeholder:text-gray-300"
                        />
                        <button
                            onClick={copyToClipboard}
                            className={`flex h-10 w-12 items-center justify-center rounded-lg transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
                                }`}
                        >
                            {copied ? (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                            )}
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-100">
                        <span className="font-bold">Note:</span> This token is single-use and will expire in 14 days. You can generate more links from the dashboard.
                    </p>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow hover:bg-gray-800 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
