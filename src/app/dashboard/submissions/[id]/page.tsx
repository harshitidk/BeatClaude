'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubmissionReviewPage() {
    const params = useParams();
    const router = useRouter();
    const submissionId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [sub, setSub] = useState<any>(null);
    const [error, setError] = useState('');
    const [overrideSaving, setOverrideSaving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        async function fetchSubmission() {
            try {
                const res = await fetch(`/api/submissions/${submissionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSub(data);
                } else {
                    const err = await res.json();
                    setError(err.error || 'Failed to loaded submission.');
                }
            } catch {
                setError('Network error loading submission.');
            } finally {
                setLoading(false);
            }
        }

        fetchSubmission();
    }, [submissionId, router]);

    const handleOverride = async (rec: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setOverrideSaving(true);
        try {
            const res = await fetch(`/api/submissions/${submissionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ recommendation: rec })
            });

            if (res.ok) {
                setSub((prev: any) => ({ ...prev, hr_override: rec }));
            } else {
                alert('Failed to save override');
            }
        } catch {
            alert('Network error');
        } finally {
            setOverrideSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
                <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
        );
    }

    if (error || !sub) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
                <div className="text-center rounded-2xl bg-white p-8 border border-red-200 shadow-sm max-w-sm w-full text-red-600">
                    <p>{error}</p>
                    <Link href="/dashboard" className="text-sm font-bold text-blue-600 underline mt-4 inline-block">Home</Link>
                </div>
            </div>
        );
    }

    const { scoringBreakdown = sub.scoring_breakdown } = sub;
    const finalRec = sub.hr_override || sub.recommendation;
    const isAiScoring = sub.scoring_status === 'scoring' || sub.scoring_status === 'pending';

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-200">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                        </Link>
                        <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude HR</span>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
                {/* Back link */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Submissions
                </button>

                <div className="grid grid-cols-[1fr_360px] gap-8 items-start">
                    {/* LEFT COLUMN: Deep Dive */}
                    <div className="space-y-6">
                        <div className="rounded-[24px] bg-white p-8 border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-gray-900">
                            <h1 className="text-3xl font-black mb-1">{sub.candidate_identifier}</h1>
                            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest">{sub.job_title}</p>

                            {isAiScoring ? (
                                <div className="mt-8 rounded-xl bg-amber-50 p-6 border border-amber-200 flex items-center gap-3">
                                    <svg className="h-6 w-6 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    <span className="text-sm font-bold text-amber-800">AI is currently analyzing these responses...</span>
                                </div>
                            ) : sub.scoring_status === 'scored' && typeof scoringBreakdown?.overall_score === 'number' ? (
                                <div className="mt-10 mb-6">
                                    <div className="flex items-center gap-6 mb-4">
                                        <div className="flex flex-col items-center">
                                            <span className="text-4xl font-black text-gray-900">{scoringBreakdown.overall_score}</span>
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Score</span>
                                        </div>
                                        <div className="h-12 w-px bg-gray-200"></div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold uppercase text-gray-500 mb-1">AI Reasoning</h3>
                                            <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                                {scoringBreakdown.explanation || scoringBreakdown.reasoning || "No explanation provided."}
                                            </p>
                                        </div>
                                    </div>

                                    {scoringBreakdown.scores && scoringBreakdown.scores.length > 0 ? (
                                        <div className="mt-8 space-y-4">
                                            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Cumulative Metrics</h4>
                                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                                <table className="w-full text-left text-sm text-gray-700">
                                                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                                                        <tr>
                                                            <th className="px-6 py-3 border-b border-gray-200">Metric</th>
                                                            <th className="px-6 py-3 border-b border-gray-200 text-right">Total Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        <tr>
                                                            <td className="px-6 py-4 font-medium">Concept Accuracy</td>
                                                            <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                                {scoringBreakdown.scores.reduce((acc: number, s: any) => acc + (s.concept_accuracy || 0), 0)} / {scoringBreakdown.scores.length * 5}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-6 py-4 font-medium">Reasoning Quality</td>
                                                            <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                                {scoringBreakdown.scores.reduce((acc: number, s: any) => acc + (s.reasoning_quality || 0), 0)} / {scoringBreakdown.scores.length * 5}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-6 py-4 font-medium">Clarity</td>
                                                            <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                                {scoringBreakdown.scores.reduce((acc: number, s: any) => acc + (s.clarity || 0), 0)} / {scoringBreakdown.scores.length * 5}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : scoringBreakdown.stages ? (
                                        <div className="mt-8 space-y-4">
                                            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Dimensional Feedback</h4>
                                            {scoringBreakdown.stages.map((stage: any) => (
                                                <div key={stage.stage_index} className="rounded-xl border border-gray-100 bg-gray-50 p-4 pl-5 relative overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600"></div>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-black uppercase tracking-widest text-blue-900">STAGE {stage.stage_index}</span>
                                                        <span className="text-sm font-black text-gray-900">{stage.score}/10</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {stage.feedback}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : sub.scoring_status === 'error' || typeof scoringBreakdown?.overall_score !== 'number' ? (
                                <div className="mt-8 p-6 bg-red-50 border border-red-200 text-red-600 rounded-xl">
                                    <h3 className="font-bold">Error loading AI score data.</h3>
                                    <p className="text-xs mt-1 text-red-500 whitespace-pre-wrap">{sub.raw_scoring_output || "The AI encountered an issue generating or parsing the results."}</p>
                                </div>
                            ) : null}
                        </div>

                        {/* Raw Responses Log */}
                        <h2 className="text-xl font-black text-gray-900 mt-12 mb-6 flex items-center gap-2">
                            Raw Candidate Responses
                            <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">{sub.stages.reduce((acc: number, s: any) => acc + s.answers.length, 0)}</span>
                        </h2>

                        <div className="space-y-8">
                            {sub.stages.map((stage: any) => (
                                <div key={stage.stage_index} className="space-y-4">
                                    <h3 className="sticky top-16 z-10 py-2 bg-[#f5f6f8] text-sm font-black uppercase tracking-widest text-gray-400">
                                        Stage {stage.stage_index}
                                    </h3>
                                    {stage.answers.map((ans: any, i: number) => {
                                        const correctOption = ans.options?.find((o: any) => o.is_correct);
                                        let isCorrect: boolean | null = null;
                                        if (['mcq', 'hybrid_choice_justification'].includes(ans.question_type) && correctOption) {
                                            isCorrect = ans.selected_option_id === correctOption.id;
                                        }

                                        let borderColor = 'border-gray-200';
                                        let bgClass = 'bg-white';
                                        let innerBgClass = 'bg-blue-50/50';
                                        let innerBorderClass = 'border-blue-100';
                                        let labelColorClass = 'text-blue-400';
                                        let valueColorClass = 'text-blue-900';

                                        if (isCorrect === true) {
                                            borderColor = 'border-emerald-300';
                                            bgClass = 'bg-emerald-50/20';
                                            innerBgClass = 'bg-emerald-50';
                                            innerBorderClass = 'border-emerald-100';
                                            labelColorClass = 'text-emerald-600';
                                            valueColorClass = 'text-emerald-900';
                                        } else if (isCorrect === false) {
                                            borderColor = 'border-red-300';
                                            bgClass = 'bg-red-50/20';
                                            innerBgClass = 'bg-red-50';
                                            innerBorderClass = 'border-red-100';
                                            labelColorClass = 'text-red-500';
                                            valueColorClass = 'text-red-900';
                                        }

                                        return (
                                            <div key={i} className={`rounded-2xl border shadow-sm p-6 focus-within:ring-2 ring-blue-500 ${bgClass} ${borderColor}`}>
                                                <div className="flex justify-between items-start gap-4 mb-3">
                                                    <p className="text-sm font-bold text-gray-900 leading-relaxed max-w-3xl">
                                                        <span className="text-blue-600 mr-2">Q{(stage.stage_index - 1) * 4 + i + 1}.</span>
                                                        {ans.prompt_text}
                                                    </p>
                                                </div>

                                                <div className={`mt-4 p-4 rounded-xl border ${innerBgClass} ${innerBorderClass}`}>
                                                    {ans.question_type === 'mcq' ? (
                                                        <div>
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${labelColorClass}`}>Selected Option</span>
                                                            <span className={`text-sm font-bold ${valueColorClass}`}>
                                                                {ans.options?.find((o: any) => o.id === ans.selected_option_id)?.label || 'No selection'}
                                                            </span>
                                                            {isCorrect === false && correctOption && (
                                                                <div className="mt-3 pt-3 border-t border-red-200/50">
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 text-emerald-600">Correct Answer</span>
                                                                    <span className="text-sm font-bold text-emerald-900">{correctOption.label}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : ans.question_type === 'short_structured' ? (
                                                        <div>
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 text-blue-400`}>Written Response</span>
                                                            <p className={`text-sm font-medium whitespace-pre-wrap text-gray-800`}>
                                                                {ans.answer_text || <span className="text-gray-400 italic">No answer provided</span>}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${labelColorClass}`}>Choice</span>
                                                                <span className={`text-sm font-bold ${valueColorClass}`}>
                                                                    {ans.options?.find((o: any) => o.id === ans.selected_option_id)?.label || 'None'}
                                                                </span>
                                                                {isCorrect === false && correctOption && (
                                                                    <div className="mt-3 pt-3 border-t border-red-200/50">
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 text-emerald-600">Correct Answer</span>
                                                                        <span className="text-sm font-bold text-emerald-900">{correctOption.label}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 text-blue-400`}>Justification</span>
                                                                <p className={`text-sm font-medium whitespace-pre-wrap text-gray-800`}>
                                                                    {ans.answer_text || 'None'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Action Panel */}
                    <div className="sticky top-24 space-y-6">
                        <div className="rounded-2xl border bg-white p-6 shadow-xl shadow-gray-200/50 border-gray-200 border-t-4 border-t-gray-900">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Final Disposition</h3>

                            <div className="mb-8">
                                <div className="text-center rounded-xl py-6 bg-gray-50 border border-gray-100">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Status</p>
                                    <span className={`inline-block text-2xl font-black ${finalRec === 'Advance' ? 'text-emerald-500' :
                                        finalRec === 'Hold' ? 'text-amber-500' :
                                            finalRec === 'Reject' ? 'text-red-500' : 'text-gray-900'
                                        }`}>
                                        {finalRec || 'Pending'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1 text-center">HR Override</p>
                                <button
                                    onClick={() => handleOverride('Advance')}
                                    disabled={overrideSaving || isAiScoring}
                                    className={`w-full rounded-xl py-3 px-4 text-sm font-black transition-all ${finalRec === 'Advance' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                >
                                    Proceed to Interview
                                </button>
                                <button
                                    onClick={() => handleOverride('Hold')}
                                    disabled={overrideSaving || isAiScoring}
                                    className={`w-full rounded-xl py-3 px-4 text-sm font-black transition-all ${finalRec === 'Hold' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white border-2 border-amber-100 text-amber-600 hover:bg-amber-50'
                                        }`}
                                >
                                    Keep on Hold
                                </button>
                                <button
                                    onClick={() => handleOverride('Reject')}
                                    disabled={overrideSaving || isAiScoring}
                                    className={`w-full rounded-xl py-3 px-4 text-sm font-black transition-all ${finalRec === 'Reject' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white border-2 border-red-100 text-red-600 hover:bg-red-50'
                                        }`}
                                >
                                    Reject Candidate
                                </button>
                            </div>
                        </div>

                        {/* Metadata card */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Metadata</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-semibold text-gray-500">Date Taken</span>
                                    <span className="font-bold text-gray-900">{sub.completed_at ? new Date(sub.completed_at).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-semibold text-gray-500">Time Logged</span>
                                    <span className="font-bold text-gray-900">{sub.time_taken_seconds ? `${Math.floor(sub.time_taken_seconds / 60)} min` : '--'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
}
