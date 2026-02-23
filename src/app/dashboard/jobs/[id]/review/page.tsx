'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Competency {
    name: string;
    weight: number;
}

interface ParsedData {
    function: string;
    role_family: string;
    seniority: string;
    decision_context: string;
    core_competencies: Competency[];
    tools: string[];
    constraints: string[];
    confidence_score: number;
}

interface ValidationInfo {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export default function ReviewPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [jobTitle, setJobTitle] = useState('');
    const [parsed, setParsed] = useState<ParsedData | null>(null);
    const [validation, setValidation] = useState<ValidationInfo | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        async function fetchData() {
            try {
                // Fetch job details
                const jobRes = await fetch(`/api/jobs/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (jobRes.ok) {
                    const jobData = await jobRes.json();
                    setJobTitle(jobData.title);
                }

                // Fetch parsed schema
                const schemaRes = await fetch(`/api/jobs/${jobId}/schema`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (schemaRes.ok) {
                    const schemaData = await schemaRes.json();
                    setParsed(schemaData.parsed);
                    setValidation(schemaData.validation);
                } else if (schemaRes.status === 404) {
                    setError('No parsed schema found. The JD has not been analyzed yet.');
                } else {
                    setError('Failed to load parsed schema.');
                }
            } catch {
                setError('Network error.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [jobId, router]);

    const SENIORITY_COLORS: Record<string, string> = {
        Entry: 'bg-sky-100 text-sky-700',
        Mid: 'bg-amber-100 text-amber-700',
        Senior: 'bg-purple-100 text-purple-700',
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
                <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
                        <Link href="/dashboard" className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-200">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                            </div>
                            <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude</span>
                        </Link>
                    </div>
                </header>
                <main className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <svg className="mx-auto h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="mt-3 text-sm text-gray-500">Loading parsed schema...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-200">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                        </div>
                        <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude</span>
                    </Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-4xl px-6 py-8">
                {/* Back */}
                <Link
                    href="/dashboard"
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Back to Dashboard
                </Link>

                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                        <p className="text-sm text-red-600">{error}</p>
                        <Link href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline">
                            Return to Dashboard
                        </Link>
                    </div>
                )}

                {parsed && validation && (
                    <>
                        {/* Title + Validation Status */}
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{jobTitle || 'Parsed Schema'}</h1>
                                <p className="mt-1 text-sm text-gray-500">AI-extracted hiring schema — review and confirm before generating tests.</p>
                            </div>
                            <div className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${validation.valid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {validation.valid ? '✓ Valid' : '✗ Needs Review'}
                            </div>
                        </div>

                        {/* Validation Messages */}
                        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                            <div className="mb-6 space-y-2">
                                {validation.errors.map((e, i) => (
                                    <div key={`e-${i}`} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                        </svg>
                                        <span className="text-sm text-red-700">{e}</span>
                                    </div>
                                ))}
                                {validation.warnings.map((w, i) => (
                                    <div key={`w-${i}`} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                                        </svg>
                                        <span className="text-sm text-amber-700">{w}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Layer 1: Role Classification */}
                        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">1</span>
                                Role Classification
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase text-gray-400">Function</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900">{parsed.function}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase text-gray-400">Role Family</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900">{parsed.role_family}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase text-gray-400">Seniority</p>
                                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-bold ${SENIORITY_COLORS[parsed.seniority] || 'bg-gray-100 text-gray-600'}`}>
                                        {parsed.seniority}
                                    </span>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase text-gray-400">Decision Context</p>
                                    <p className="mt-1 text-sm text-gray-700">{parsed.decision_context}</p>
                                </div>
                            </div>
                        </div>

                        {/* Layer 2: Competencies */}
                        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">2</span>
                                Core Competencies
                                <span className="ml-auto text-xs font-normal text-gray-400">
                                    {parsed.core_competencies.length} competencies • Weights sum to {parsed.core_competencies.reduce((s, c) => s + c.weight, 0).toFixed(2)}
                                </span>
                            </h2>
                            <div className="space-y-3">
                                {parsed.core_competencies.map((comp, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-semibold text-gray-800">{comp.name}</span>
                                                <span className="text-xs font-bold text-blue-600">{(comp.weight * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                                    style={{ width: `${comp.weight * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Layer 3: Tools & Constraints */}
                        <div className="mb-5 grid grid-cols-2 gap-5">
                            {/* Tools */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">3</span>
                                    Tools
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {parsed.tools.map((tool, i) => (
                                        <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                                            {tool}
                                        </span>
                                    ))}
                                    {parsed.tools.length === 0 && (
                                        <p className="text-xs text-gray-400">No tools extracted</p>
                                    )}
                                </div>
                            </div>

                            {/* Constraints */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Constraints</h2>
                                <ul className="space-y-2">
                                    {parsed.constraints.map((c, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                                            {c}
                                        </li>
                                    ))}
                                    {parsed.constraints.length === 0 && (
                                        <p className="text-xs text-gray-400">No constraints identified</p>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Confidence */}
                        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-wider text-gray-500">AI Confidence</p>
                                    <p className="mt-1 text-3xl font-black text-gray-900">{(parsed.confidence_score * 100).toFixed(0)}%</p>
                                </div>
                                <div className="h-16 w-16">
                                    <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                        <circle
                                            cx="18" cy="18" r="15.9155" fill="none"
                                            stroke={parsed.confidence_score >= 0.7 ? '#10b981' : parsed.confidence_score >= 0.4 ? '#f59e0b' : '#ef4444'}
                                            strokeWidth="3"
                                            strokeDasharray={`${parsed.confidence_score * 100} ${100 - parsed.confidence_score * 100}`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">
                                {validation.valid
                                    ? 'Schema looks good. You can proceed to generate the assessment test.'
                                    : 'Please review the schema above. Fix any issues before generating a test.'}
                            </p>
                            <div className="flex gap-3">
                                <Link
                                    href="/dashboard"
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Back to Dashboard
                                </Link>
                                <button
                                    disabled={!validation.valid}
                                    className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Generate Test →
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
