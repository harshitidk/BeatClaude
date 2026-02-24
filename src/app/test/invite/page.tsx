'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface InviteData {
    valid: boolean;
    assessment: {
        id: string;
        job_title: string;
        duration_seconds: number;
    };
}

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center">Loading...</div>}>
            <CandidatePortalInvitePage />
        </Suspense>
    );
}

function CandidatePortalInvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [inviteData, setInviteData] = useState<InviteData | null>(null);
    const [error, setError] = useState('');
    const [starting, setStarting] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Missing invite token in URL.');
            setLoading(false);
            return;
        }

        async function verifyToken() {
            try {
                const res = await fetch(`/api/invite/verify?token=${token}`);
                if (res.ok) {
                    const data = await res.json();
                    setInviteData(data);
                } else {
                    const errStr = await res.json();
                    setError(errStr.error || 'Invalid or expired magic link.');
                }
            } catch {
                setError('Network error validating magic link.');
            } finally {
                setLoading(false);
            }
        }

        verifyToken();
    }, [token]);

    const handleStartTest = async () => {
        if (!token) return;
        if (!name.trim() || !email.trim()) {
            setError('Please provide your name and email to continue.');
            return;
        }
        setStarting(true);
        setError('');
        try {
            const res = await fetch(`/api/invite/${token}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            });
            if (res.ok) {
                const data = await res.json();
                // data contains instance_id, current_stage, questions
                router.push(`/test/${data.instance_id}/take`);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to start test session.');
            }
        } catch {
            setError('Network connection error.');
        } finally {
            setStarting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
                <div className="flex flex-col items-center">
                    <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="mt-4 text-sm font-medium text-gray-500">Verifying secure link...</p>
                </div>
            </div>
        );
    }

    if (error || !inviteData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Link Unavailable</h2>
                    <p className="mt-2 text-sm text-gray-500">{error}</p>
                    <p className="mt-4 text-xs text-gray-400">Please contact the hiring team if you need a new link.</p>
                </div>
            </div>
        );
    }

    const minutes = Math.round(inviteData.assessment.duration_seconds / 60);

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            <header className="flex h-16 w-full items-center justify-center bg-white shadow-sm">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-sm shadow-blue-200">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                    </div>
                    <span className="text-lg font-black text-gray-900 tracking-tight">Beat Claude</span>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center p-6 pb-24">
                <div className="w-full max-w-2xl rounded-[32px] border border-gray-200 bg-white p-10 shadow-xl shadow-blue-900/5 sm:p-14">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-6 border border-blue-100 shadow-sm">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>

                    <h1 className="text-center text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                        {inviteData.assessment.job_title} Assessment
                    </h1>

                    <p className="mx-auto mt-4 max-w-lg text-center text-base leading-relaxed text-gray-500">
                        Welcome! This tailored assessment evaluates the core competencies required for the role. Before you begin, please read the instructions carefully.
                    </p>

                    <div className="my-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col items-center rounded-2xl bg-gray-50 p-6 shadow-sm border border-gray-100">
                            <span className="text-2xl font-black text-gray-900">{minutes} MIN</span>
                            <span className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">Time Limit</span>
                            <span className="mt-2 text-center text-[11px] font-medium leading-tight text-gray-500">The timer cannot be paused once started.</span>
                        </div>
                        <div className="flex flex-col items-center rounded-2xl bg-blue-50 p-6 shadow-sm border border-blue-100">
                            <span className="text-2xl font-black text-blue-900">16 Qs</span>
                            <span className="mt-1 text-xs font-bold uppercase tracking-widest text-blue-400">Total Questions</span>
                            <span className="mt-2 text-center text-[11px] font-medium leading-tight text-blue-600">Divided into 4 stages. You cannot return to a previous stage.</span>
                        </div>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-5 shadow-sm border border-amber-200">
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-700">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Important Instructions
                        </h3>
                        <ul className="ml-5 list-disc space-y-2 text-sm text-amber-900 marker:text-amber-500">
                            <li className="font-medium">Ensure you have a stable internet connection.</li>
                            <li className="font-medium">Your progress is autosaved continuously.</li>
                            <li className="font-medium">Once you click <span className="font-bold underline">Next Section</span>, you <span className="font-bold underline text-red-600">cannot</span> go back to change answers.</li>
                            <li className="font-medium">When the time limit is reached, your latest answers are automatically submitted.</li>
                        </ul>
                    </div>

                    <div className="mt-10 flex flex-col gap-4 max-w-[320px] mx-auto w-full">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={starting}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={starting}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                    </div>

                    <div className="mt-6 flex flex-col items-center">
                        <button
                            onClick={handleStartTest}
                            disabled={starting}
                            className={`w-full max-w-[320px] rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/30 ${starting ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {starting ? 'Preparing Session...' : 'Start Test Now'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
