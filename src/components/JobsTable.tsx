'use client';

import { useState } from 'react';

interface Job {
    id: string;
    title: string;
    status: 'draft' | 'active' | 'closed';
    submitted_count: number;
    last_activity_at: string;
    created_at: string;
}

interface JobsTableProps {
    jobs: Job[];
    onStatusChange: (jobId: string, newStatus: string) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

function StatusBadge({ status }: { status: string }) {
    const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${style.bg} ${style.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {status}
        </span>
    );
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JobsTable({ jobs, onStatusChange }: JobsTableProps) {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Job Title</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Candidates</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Created Date</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</span>
            </div>

            {/* Table rows */}
            {jobs.map((job, index) => (
                <div
                    key={job.id}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-blue-50/40 ${index < jobs.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                >
                    {/* Title */}
                    <div>
                        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 text-left transition-colors">
                            {job.title}
                        </button>
                    </div>

                    {/* Status */}
                    <div>
                        <StatusBadge status={job.status} />
                    </div>

                    {/* Candidates */}
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-gray-900">{job.submitted_count}</span>
                        <span className="text-xs text-gray-400">submitted</span>
                    </div>

                    {/* Date */}
                    <div className="text-sm text-gray-500">
                        {formatDate(job.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="relative flex justify-end">
                        <button
                            onClick={() => setOpenMenu(openMenu === job.id ? null : job.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {openMenu === job.id && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                                <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl shadow-gray-200/50">
                                    {job.status === 'draft' && (
                                        <button
                                            onClick={() => { onStatusChange(job.id, 'active'); setOpenMenu(null); }}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                            </svg>
                                            Activate
                                        </button>
                                    )}
                                    {job.status === 'active' && (
                                        <button
                                            onClick={() => { onStatusChange(job.id, 'closed'); setOpenMenu(null); }}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Close Job
                                        </button>
                                    )}
                                    {job.status === 'closed' && (
                                        <p className="px-4 py-2 text-xs text-gray-400">No actions available</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ))}

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-3">
                <p className="text-xs text-gray-400">
                    Showing {jobs.length} total job{jobs.length !== 1 ? 's' : ''}
                </p>
            </div>
        </div>
    );
}
