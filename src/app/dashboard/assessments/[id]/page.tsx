'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Question {
    id: string;
    position: number;
    question_type: string;
    prompt_text: string;
    options: any[];
    char_limit: number | null;
}

interface Stage {
    stage_index: number;
    questions: Question[];
}

interface Assessment {
    id: string;
    job_id: string;
    job_title: string;
    status: string;
    duration_seconds: number;
    active_from: string | null;
    active_until: string | null;
    single_use_magic_link: boolean;
    stages: Stage[];
}

export default function AssessmentBuilderPage() {
    const router = useRouter();
    const params = useParams();
    const assessmentId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [error, setError] = useState('');
    const [activeStage, setActiveStage] = useState(1);
    const [publishing, setPublishing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Question Edit State
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editPromptText, setEditPromptText] = useState('');
    const [savingQuestion, setSavingQuestion] = useState(false);

    // Settings state
    const [durationMinutes, setDurationMinutes] = useState(60);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        async function fetchAssessment() {
            try {
                const res = await fetch(`/api/assessments/${assessmentId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setAssessment(data);
                    setDurationMinutes(Math.round(data.duration_seconds / 60));
                } else {
                    const err = await res.json();
                    setError(err.error || 'Failed to load assessment');
                }
            } catch {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        }

        fetchAssessment();
    }, [assessmentId, router]);

    const handlePublish = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setPublishing(true);
        try {
            const res = await fetch(`/api/assessments/${assessmentId}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ durationSeconds: durationMinutes * 60 })
            });

            if (res.ok) {
                // Generate magic link token right away to show
                const inviteRes = await fetch(`/api/assessments/${assessmentId}/generate-invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ expires_in_hours: 336 }), // 14 days
                });

                if (inviteRes.ok) {
                    const inviteData = await inviteRes.json();
                    router.push(`/dashboard/assessments/${assessmentId}/published?token=${inviteData.token}`);
                } else {
                    // Fallback
                    router.push('/dashboard');
                }
            } else {
                const errData = await res.json();
                alert(errData.error || 'Failed to publish assessment');
            }
        } catch {
            alert('Network error while publishing');
        } finally {
            setPublishing(false);
        }
    };

    const handleSaveSettings = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setSavingSettings(true);
        try {
            const res = await fetch(`/api/assessments/${assessmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ durationSeconds: durationMinutes * 60 })
            });

            if (res.ok) {
                alert('Settings saved!');
            } else {
                const errData = await res.json();
                alert(errData.error || 'Failed to save settings');
            }
        } catch {
            alert('Network error while saving settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveQuestion = async (qId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setSavingQuestion(true);
        try {
            const res = await fetch(`/api/assessments/${assessmentId}/questions/${qId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ prompt_text: editPromptText })
            });
            if (res.ok) {
                const updatedQ = await res.json();
                setAssessment(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        stages: prev.stages.map(s => ({
                            ...s,
                            questions: s.questions.map(q => q.id === qId ? { ...q, prompt_text: updatedQ.prompt_text } : q)
                        }))
                    };
                });
                setEditingQuestionId(null);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save question');
            }
        } catch {
            alert('Network error while saving question');
        } finally {
            setSavingQuestion(false);
        }
    };


    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
                <div className="text-center">
                    <svg className="mx-auto h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="mt-3 text-sm text-gray-500">Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (error || !assessment) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
                <div className="text-center rounded-xl border border-red-200 bg-red-50 p-6">
                    <p className="text-sm text-red-600">{error}</p>
                    <Link href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-blue-600">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    const STAGE_NAMES = ['Orientation', 'Application', 'Judgment', 'Depth'];
    const currentStage = assessment.stages.find(s => s.stage_index === activeStage);

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-200">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                            </div>
                            <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude</span>
                        </Link>
                        <nav className="flex items-center gap-6">
                            <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
                            <Link href="#" className="text-sm font-semibold text-blue-600 relative after:content-[''] after:absolute after:-bottom-[13px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-600">Assessments</Link>
                            <Link href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Candidates</Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8">
                {/* Breadcrumb */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                        <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Home</Link>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        <span>Assessments</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        <span className="text-gray-900">Create Assessment</span>
                    </div>

                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Assessment Review</h1>
                        <p className="mt-2 text-base text-gray-500">
                            Review 16 generated questions across 4 core dimensions for the <span className="font-bold text-blue-600">{assessment.job_title}</span> role.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_360px] gap-8 items-start">
                    {/* LEFT COLUMN: Questions */}
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            {STAGE_NAMES.map((name, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveStage(idx + 1)}
                                    className={`px-6 py-3 text-sm font-semibold transition-colors ${activeStage === idx + 1
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-400 hover:text-gray-700'
                                        }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>

                        {/* Stage Content */}
                        {currentStage && (
                            <div>
                                <div className="flex items-center justify-between mb-4 mt-8">
                                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100/50">
                                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        {STAGE_NAMES[activeStage - 1]} Questions ({currentStage.questions.length})
                                    </h2>
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">STAGE {activeStage}</span>
                                </div>

                                <div className="space-y-4">
                                    {currentStage.questions.map((q, qIdx) => (
                                        <div key={q.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group relative">
                                            {editingQuestionId === q.id ? (
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs font-medium text-blue-600 uppercase tracking-widest">Editing Question</span>
                                                        <span className="text-xs text-gray-400">#{String((activeStage - 1) * 4 + qIdx + 1).padStart(2, '0')}</span>
                                                    </div>
                                                    <textarea
                                                        value={editPromptText}
                                                        onChange={(e) => setEditPromptText(e.target.value)}
                                                        className="w-full min-h-[100px] border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-y text-gray-800"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingQuestionId(null)}
                                                            className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                            disabled={savingQuestion}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveQuestion(q.id)}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center min-w-[80px]"
                                                            disabled={savingQuestion}
                                                        >
                                                            {savingQuestion ? 'Saving...' : 'Save'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        className="absolute top-4 right-4 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                                                        onClick={() => {
                                                            setEditingQuestionId(q.id);
                                                            setEditPromptText(q.prompt_text);
                                                        }}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5h.036z" />
                                                        </svg>
                                                    </button>
                                                    <div className="mb-3 flex items-center gap-3 pr-8">
                                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${q.question_type === 'mcq' ? 'bg-blue-50 text-blue-600' :
                                                            q.question_type === 'short_structured' ? 'bg-purple-50 text-purple-600' :
                                                                'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {q.question_type === 'mcq' ? 'Multiple Choice' : q.question_type === 'short_structured' ? 'Short Answer' : 'Hybrid'}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-400">#{String((activeStage - 1) * 4 + qIdx + 1).padStart(2, '0')}</span>
                                                    </div>
                                                    <p className="text-[15px] font-semibold text-gray-900 leading-snug break-words">{q.prompt_text}</p>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Settings Panel */}
                    <div className="space-y-6 sticky top-24">
                        <div className="rounded-2xl border-2 border-blue-600 bg-white shadow-xl shadow-blue-900/5 p-6 relative overflow-hidden">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Global Settings
                            </h3>

                            <div className="space-y-6">
                                {/* Duration */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Test Duration
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={durationMinutes}
                                            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">MIN</span>
                                    </div>
                                    <p className="mt-2 text-[11px] text-gray-500 leading-tight">Candidates will have a hard cutoff after {durationMinutes} minutes.</p>
                                </div>

                                {/* Active Duration */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
                                        Active Duration
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            defaultValue={14}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">DAYS</span>
                                    </div>
                                    <p className="mt-2 text-[11px] text-gray-500 leading-tight">Link expires 14 days after being sent to a candidate.</p>
                                </div>

                                {/* Difficulty visualizer */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2.243a2 2 0 011.562.748l2.766 3.504a2 2 0 003.116-.27l3.748-5.623a2 2 0 012.396-.826L21 11" /></svg>
                                        Overall Difficulty
                                    </label>
                                    <div className="flex gap-1">
                                        <div className="h-1.5 flex-1 rounded-full bg-blue-600"></div>
                                        <div className="h-1.5 flex-1 rounded-full bg-blue-600"></div>
                                        <div className="h-1.5 flex-1 rounded-full bg-blue-600"></div>
                                        <div className="h-1.5 flex-1 rounded-full bg-gray-200"></div>
                                        <div className="h-1.5 flex-1 rounded-full bg-gray-200"></div>
                                    </div>
                                    <p className="mt-1.5 text-center text-xs font-medium text-gray-500">Intermediate / Senior</p>
                                </div>

                                <div className="border-t border-gray-100 pt-4 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                    <span className="text-xs font-medium text-emerald-600 tracking-wide">All changes autosaved</span>
                                </div>

                                <div className="pt-2 flex flex-col gap-3">
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing}
                                        className="relative w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {publishing ? (
                                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        ) : (
                                            <>Publish Assessment <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.36 3 3 0 11-2.64-2.94V16m7.84-1.63a6 6 0 00-5.84-7.36 3 3 0 10-2.64 2.94V8m7.84 6.37l-7.84-6.37" /></svg></>
                                        )}
                                    </button>

                                    {assessment.status === 'active' ? (
                                        <button
                                            onClick={handleSaveSettings}
                                            disabled={savingSettings}
                                            className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {savingSettings ? 'Saving...' : 'Save Settings'}
                                        </button>
                                    ) : (
                                        <button className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                                            Save as Draft
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Assessment Matrix small graphic */}
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-4">Assessment Matrix</h4>
                            <div className="flex items-end gap-1 h-12">
                                <div className="w-full bg-blue-300 rounded-t-sm" style={{ height: '30%' }} />
                                <div className="w-full bg-blue-400 rounded-t-sm" style={{ height: '50%' }} />
                                <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: '80%' }} />
                                <div className="w-full bg-blue-600 rounded-t-sm" style={{ height: '100%' }} />
                            </div>
                            <div className="flex justify-between mt-2 px-2 text-[9px] font-bold text-gray-400">
                                <span>ORI</span>
                                <span>APP</span>
                                <span>JUD</span>
                                <span>DEP</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
