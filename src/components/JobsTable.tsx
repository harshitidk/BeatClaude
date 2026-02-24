'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Job {
    id: string;
    title: string;
    role_family?: string;
    seniority?: string;
    job_function?: string;
    has_parsed_schema?: boolean;
    status: 'draft' | 'active' | 'closed';
    submitted_count: number;
    assessment_id?: string | null;
    invite_token?: string | null;
    last_activity_at: string;
    created_at: string;
}

interface JobsTableProps {
    jobs: Job[];
    onStatusChange: (jobId: string, newStatus: string) => void;
    onDelete: (jobId: string) => void;
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

function getDisplayTitle(job: Job): string {
    // Show the role family (job role being hired for) if parsed schema exists
    if (job.role_family && job.role_family.trim()) {
        return job.role_family;
    }
    return job.title;
}

function getSubtitle(job: Job): string | null {
    const parts: string[] = [];
    if (job.seniority && job.seniority.trim()) parts.push(job.seniority);
    if (job.job_function && job.job_function.trim()) parts.push(job.job_function);
    if (parts.length === 0) return null;
    return parts.join(' · ');
}

export default function JobsTable({ jobs, onStatusChange, onDelete }: JobsTableProps) {
    const router = useRouter();
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleRowClick = (job: Job) => {
        if (job.status === 'active' || job.status === 'closed') {
            router.push(`/dashboard/jobs/${job.id}/results`);
        } else {
            router.push(`/dashboard/jobs/${job.id}/review`);
        }
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-3.5 rounded-t-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Job Title</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Candidates</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Created Date</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</span>
            </div>

            {/* Table rows */}
            {jobs.map((job, index) => {
                const displayTitle = getDisplayTitle(job);
                const subtitle = getSubtitle(job);

                return (
                    <div
                        key={job.id}
                        onClick={() => handleRowClick(job)}
                        className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-blue-50/40 cursor-pointer ${index < jobs.length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                    >
                        {/* Title */}
                        <div>
                            <button
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 text-left transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(job);
                                }}
                            >
                                {displayTitle}
                            </button>
                            {subtitle && (
                                <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
                            )}
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
                        <div className="relative flex justify-end items-center gap-1">
                            {job.invite_token && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(`${window.location.origin}/test/invite?token=${job.invite_token}`);
                                        alert('Magic link copied to clipboard!');
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                    title="Copy Magic Link"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-[18px] w-[18px]">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                    </svg>
                                </button>
                            )}

                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === job.id ? null : job.id); }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                </svg>
                            </button>

                            {/* Dropdown */}
                            {openMenu === job.id && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenu(null); }} />
                                    <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl shadow-gray-200/50">
                                        {(job.status === 'draft' || job.status === 'closed') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'active'); setOpenMenu(null); }}
                                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                                </svg>
                                                {job.status === 'draft' ? 'Activate' : 'Re-activate'}
                                            </button>
                                        )}
                                        {job.status === 'active' && (
                                            <>
                                                {job.assessment_id && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/assessments/${job.assessment_id}`); setOpenMenu(null); }}
                                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                                        </svg>
                                                        Edit Quiz
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'closed'); setOpenMenu(null); }}
                                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Close Job
                                                </button>
                                            </>
                                        )}
                                        {/* Divider before delete */}
                                        <div className="my-1 border-t border-gray-100" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setConfirmDeleteId(job.id); }}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-3 rounded-b-xl">
                <p className="text-xs text-gray-400">
                    Showing {jobs.length} total job{jobs.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
                    <div
                        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </div>
                        <h3 className="text-center text-lg font-bold text-gray-900">Delete Assessment</h3>
                        <p className="mt-2 text-center text-sm text-gray-500">
                            This will permanently delete this assessment, including all parsed data, tests, and candidate submissions. This action cannot be undone.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
