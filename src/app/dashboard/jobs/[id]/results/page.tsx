'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubmissionSummary {
    id: string;
    candidate_identifier: string;
    started_at: string;
    completed_at: string;
    time_taken_seconds: number;
    scoring_status: string; // pending, scoring, scored, error
    recommendation: string | null;
    hr_override: string | null;
}

interface ResultsData {
    job_id: string;
    job_title: string;
    total_submissions: number;
    submissions: SubmissionSummary[];
}

export default function JobResultsPage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ResultsData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        async function fetchResults() {
            try {
                const res = await fetch(`/api/jobs/${jobId}/results`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                } else {
                    const err = await res.json();
                    setError(err.error || 'Failed to loaded results.');
                }
            } catch {
                setError('Network error loading results.');
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [jobId, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col bg-[#f5f6f8] items-center justify-center">
                <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <p className="mt-4 text-sm text-gray-500">Loading results...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-red-100">
                    <p className="text-red-500">{error}</p>
                    <Link href="/dashboard" className="mt-4 inline-block font-bold text-blue-600">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    const formatTime = (secs: number) => {
        if (!secs) return 'N/A';
        const m = Math.floor(secs / 60);
        return `${m} min`;
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-200">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                        </div>
                        <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude</span>
                    </Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-6 py-10">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <span>Submissions</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{data.job_title}</h1>
                        <p className="mt-2 text-sm font-medium text-gray-500">
                            {data.total_submissions} candidate{data.total_submissions !== 1 ? 's have' : ' has'} completed this assessment.
                        </p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-xl shadow-blue-900/5">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-gray-100 bg-gray-50/80 px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                        <div>Candidate ID</div>
                        <div>Date</div>
                        <div>Time Taken</div>
                        <div>AI Recommendation</div>
                        <div>Action</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {data.submissions.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">No submissions yet for this role.</div>
                        ) : (
                            data.submissions.map(sub => (
                                <div key={sub.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-8 py-5 transition-colors hover:bg-blue-50/30">
                                    <div className="font-mono text-sm font-black text-gray-900">{sub.candidate_identifier}</div>
                                    <div className="text-sm font-medium text-gray-500">
                                        {new Date(sub.completed_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm font-medium text-gray-500">{formatTime(sub.time_taken_seconds)}</div>
                                    <div>
                                        {sub.scoring_status === 'scored' ? (
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${sub.hr_override || sub.recommendation === 'Advance' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                                                sub.hr_override || sub.recommendation === 'Hold' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                                                    'bg-red-50 text-red-700 ring-red-600/20'
                                                }`}>
                                                {sub.hr_override ? `${sub.hr_override} (HR)` : sub.recommendation}
                                            </span>
                                        ) : sub.scoring_status === 'scoring' ? (
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                Scoring AI
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-400">Pending</span>
                                        )}
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => router.push(`/dashboard/submissions/${sub.id}`)}
                                            className="rounded-lg bg-white border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-blue-600 transition-all active:scale-95"
                                        >
                                            Review
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
