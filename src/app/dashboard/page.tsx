'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import EmptyState from '@/components/EmptyState';
import JobsTable from '@/components/JobsTable';

interface Job {
    id: string;
    title: string;
    role_family?: string;
    seniority?: string;
    job_function?: string;
    has_parsed_schema?: boolean;
    status: 'draft' | 'active' | 'closed';
    submitted_count: number;
    last_activity_at: string;
    created_at: string;
}

type DashboardState = 'loading' | 'empty' | 'populated' | 'error';

export default function DashboardPage() {
    const router = useRouter();
    const [state, setState] = useState<DashboardState>('loading');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [error, setError] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [creating, setCreating] = useState(false);

    const getToken = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return null;
        }
        return token;
    }, [router]);

    const fetchDashboard = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch('/api/dashboard', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Failed to fetch dashboard data');
                setState('error');
                return;
            }

            const data = await res.json();
            setJobs(data.jobs);
            setState(data.jobs.length === 0 ? 'empty' : 'populated');

            // Save to cache for instant future loads
            localStorage.setItem('dashboard_cache', JSON.stringify(data.jobs));
        } catch {
            setError('Network error. Please check your connection.');
            setState('error');
        }
    }, [getToken, router]);

    useEffect(() => {
        // Get user info
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserEmail(user.email || '');
            } catch { /* ignore */ }
        }

        // Optimistic UI: Preload cached dashboard data instantly
        const cacheKey = 'dashboard_cache';
        const cacheStr = localStorage.getItem(cacheKey);
        if (cacheStr) {
            try {
                const cachedJobs = JSON.parse(cacheStr);
                if (cachedJobs.length > 0) {
                    setJobs(cachedJobs);
                    setState('populated');
                } else if (cachedJobs.length === 0) {
                    setState('empty');
                }
            } catch { /* invalid cache, fall through */ }
        }

        fetchDashboard();
    }, [fetchDashboard]);

    const handleCreateJob = () => {
        router.push('/dashboard/new-job');
    };

    const handleInlineSubmitJd = async (description: string) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        // Step 1: Create job
        const createRes = await fetch('/api/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ description }),
        });

        if (!createRes.ok) {
            if (createRes.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
                return;
            }
            const data = await createRes.json();
            throw new Error(data.error || 'Failed to create job');
        }

        const job = await createRes.json();

        // Step 2: Parse JD with Gemini
        const parseRes = await fetch(`/api/jobs/${job.id}/parse`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!parseRes.ok) {
            // Still redirect to review even on parse failure
            router.push(`/dashboard/jobs/${job.id}/review`);
            return;
        }

        // Step 3: Redirect to review page
        router.push(`/dashboard/jobs/${job.id}/review`);
    };


    const handleStatusChange = useCallback(async (jobId: string, newStatus: string) => {
        const token = getToken();
        if (!token) return;

        // Optimistic UI update
        setJobs(currentJobs => {
            const nextJobs = currentJobs.map(job =>
                job.id === jobId ? { ...job, status: newStatus as any } : job
            );
            localStorage.setItem('dashboard_cache', JSON.stringify(nextJobs));
            return nextJobs;
        });

        try {
            const res = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Failed to update status');
                // Revert on failure
                fetchDashboard();
                return;
            }

            // Sync with backend quietly
            fetchDashboard();
        } catch {
            alert('Network error. Please try again.');
            fetchDashboard(); // Revert on failure
        }
    }, [getToken, fetchDashboard, setJobs]);

    const handleDeleteJob = useCallback(async (jobId: string) => {
        const token = getToken();
        if (!token) return;

        // Optimistic UI update
        setJobs(currentJobs => {
            const newJobs = currentJobs.filter(job => job.id !== jobId);
            if (newJobs.length === 0) setState('empty');
            localStorage.setItem('dashboard_cache', JSON.stringify(newJobs));
            return newJobs;
        });

        try {
            const res = await fetch(`/api/jobs/${jobId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Failed to delete assessment');
                fetchDashboard(); // Revert
                return;
            }

            fetchDashboard();
        } catch {
            alert('Network error. Please try again.');
            fetchDashboard(); // Revert
        }
    }, [getToken, fetchDashboard, setJobs]);

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            <DashboardHeader
                userEmail={userEmail}
                onCreateJob={handleCreateJob}
                creating={creating}
            />

            {/* Loading State */}
            {state === 'loading' && (
                <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">
                    {/* Skeleton heading */}
                    <div className="mb-8">
                        <div className="mb-2 h-8 w-52 animate-pulse rounded-lg bg-gray-200" />
                        <div className="h-4 w-80 animate-pulse rounded-lg bg-gray-100" />
                    </div>

                    {/* Skeleton table */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-3.5">
                            {['w-24', 'w-16', 'w-20', 'w-20', 'w-12'].map((w, i) => (
                                <div key={i} className={`h-3 ${w} animate-pulse rounded bg-gray-200`} />
                            ))}
                        </div>
                        {/* Rows */}
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 ${i < 4 ? 'border-b border-gray-100' : ''
                                    }`}
                            >
                                <div className="space-y-1.5">
                                    <div className={`h-4 animate-pulse rounded bg-gray-200`} style={{ width: `${120 + (i % 3) * 40}px` }} />
                                </div>
                                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
                                <div className="h-4 w-10 animate-pulse rounded bg-gray-100" />
                                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                                <div className="h-6 w-6 animate-pulse rounded bg-gray-100" />
                            </div>
                        ))}
                        {/* Footer */}
                        <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-3">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                <span className="text-xs text-gray-400 animate-pulse">Summoning your candidates... 🔮</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-6 mx-auto max-w-sm">
                        <div className="h-1 overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full w-1/3 animate-[loading_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        </div>
                        <p className="mt-2 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 animate-spin">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                            Brewing up your data... ☕️
                        </p>
                    </div>
                </main>
            )}

            {/* Error State */}
            {state === 'error' && (
                <main className="flex flex-1 flex-col items-center justify-center px-4">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto mb-4 h-10 w-10 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <p className="text-sm font-medium text-red-700">{error}</p>
                        <div className="mt-4 flex justify-center gap-3">
                            <button
                                onClick={() => { setState('loading'); fetchDashboard(); }}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                            >
                                Retry
                            </button>
                            <button
                                onClick={handleCreateJob}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Send it anyway 🚀
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {/* Empty State */}
            {state === 'empty' && (
                <EmptyState onSubmitJd={handleInlineSubmitJd} />
            )}

            {/* Populated State */}
            {state === 'populated' && (
                <main className="mx-auto w-full max-w-6xl px-6 py-10">
                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Hiring HQ 🎯</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Keep tabs on your AI-powered recruitment magic.
                        </p>
                    </div>

                    {/* Jobs table */}
                    <JobsTable jobs={jobs} onStatusChange={handleStatusChange} onDelete={handleDeleteJob} />
                </main>
            )}
        </div>
    );
}
