'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewJobPage() {
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [parseStatus, setParseStatus] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) router.push('/login');
    }, [router]);

    const handleSubmit = async () => {
        if (!description.trim()) {
            setError('Please paste a job description before continuing.');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        setError('');
        setSubmitting(true);
        setParseStatus('Creating job...');

        try {
            // Step 1: Create job
            const createRes = await fetch('/api/jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ description: description.trim() }),
            });

            if (!createRes.ok) {
                const data = await createRes.json();
                setError(data.error || 'Failed to create job');
                return;
            }

            const job = await createRes.json();

            // Step 2: Parse JD with Gemini
            setParseStatus('AI is analyzing the job description...');

            const parseRes = await fetch(`/api/jobs/${job.id}/parse`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!parseRes.ok) {
                const data = await parseRes.json();
                setError(data.error || 'AI parsing failed. You can retry from the dashboard.');
                // Still redirect to review even on parse failure
                router.push(`/dashboard/jobs/${job.id}/review`);
                return;
            }

            // Step 3: Redirect to review page
            setParseStatus('Done! Redirecting...');
            router.push(`/dashboard/jobs/${job.id}/review`);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
            setParseStatus('');
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-200">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude</span>
                    </Link>
                </div>
            </header>

            {/* Main content */}
            <main className="mx-auto w-full max-w-3xl px-6 py-8">
                {/* Back link */}
                <Link
                    href="/dashboard"
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Back to Dashboard
                </Link>

                {/* Card */}
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Assessment</h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        Paste the full job description below. We&apos;ll use this to generate customized
                        evaluation criteria and interview questions.
                    </p>

                    {/* Error */}
                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Label row */}
                    <div className="mt-6 flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-blue-600">
                            Job Description
                        </label>
                        <span className="text-xs italic text-gray-400">Format: Plain text or Markdown</span>
                    </div>

                    {/* Textarea */}
                    <div className="relative mt-2">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={`Example:\nWe are looking for a Senior Product Designer to join our team...\nRequirements:\n- 5+ years of experience in SaaS\n- Proficient in Figma and Design Systems...`}
                            rows={10}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-sm leading-relaxed text-gray-700 placeholder:text-gray-400/70 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        {/* Send icon */}
                        <div className="absolute bottom-4 right-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-gray-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end gap-4">
                        <Link
                            href="/dashboard"
                            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all hover:shadow-lg"
                        >
                            {submitting ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {parseStatus || 'Processing...'}
                                </>
                            ) : (
                                <>
                                    Go
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Feature badges */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                    {[
                        {
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-blue-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                </svg>
                            ),
                            title: 'AI OPTIMIZED',
                            desc: 'Our AI extracts core skills automatically.',
                        },
                        {
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-blue-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                            ),
                            title: 'PRIVATE & SECURE',
                            desc: 'Data is used only for this assessment flow.',
                        },
                        {
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-blue-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ),
                            title: 'FAST SETUP',
                            desc: 'Ready for review in under 10 seconds.',
                        },
                    ].map((badge) => (
                        <div
                            key={badge.title}
                            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                        >
                            <div className="mt-0.5">{badge.icon}</div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-900">{badge.title}</p>
                                <p className="mt-0.5 text-xs text-gray-500">{badge.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
