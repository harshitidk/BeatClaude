'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

interface Question {
    id: string;
    position: number;
    question_type: string;
    prompt_text: string;
    options: Array<{ id: string; label: string }>;
    char_limit: number | null;
}

export default function TestTakePage() {
    const params = useParams();
    const router = useRouter();
    const instanceId = params.instanceId as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [stage, setStage] = useState(1);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, { answer_text: string; selected_option_id: string }>>({});

    // Timer state
    const [timeLeft, setTimeLeft] = useState(0);
    const [timeUp, setTimeUp] = useState(false);

    // Modals
    const [showNextModal, setShowNextModal] = useState(false);
    const [hasSeenNextWarning, setHasSeenNextWarning] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);

    // Autosave
    const [saveStatus, setSaveStatus] = useState('saved'); // saved | saving | error
    const typingTimeoutRef = useRef<NodeJS.Timeout>(null);

    const fetchQuestions = useCallback(async (targetStage: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/test/${instanceId}/questions?stage=${targetStage}`);
            if (res.ok) {
                const data = await res.json();

                if (data.status === 'submitted') {
                    router.push(`/test/${instanceId}/complete`);
                    return;
                }

                setStage(data.current_stage);
                if (data.current_stage !== targetStage) {
                    // Enforced boundary navigation
                    router.replace(`/test/${instanceId}/take?stage=${data.current_stage}`);
                    return;
                }

                setQuestions(data.questions);

                // Initialize answers
                const initialAnswers: any = {};
                data.existing_answers?.forEach((ans: any) => {
                    initialAnswers[ans.question_id] = {
                        answer_text: ans.answer_text || '',
                        selected_option_id: ans.selected_option_id || ''
                    };
                });

                // Ensure empty state for missing ones
                data.questions.forEach((q: Question) => {
                    if (!initialAnswers[q.id]) {
                        initialAnswers[q.id] = { answer_text: '', selected_option_id: '' };
                    }
                });
                setAnswers(initialAnswers);

                // Set timer
                if (data.started_at && data.duration_seconds) {
                    const elapsed = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
                    const remaining = Math.max(0, data.duration_seconds - elapsed);
                    setTimeLeft(remaining);
                    if (remaining === 0) setTimeUp(true);
                }

            } else {
                const err = await res.json();
                setError(err.error || 'Failed to load test questions.');
            }
        } catch {
            setError('Network connection lost.');
        } finally {
            setLoading(false);
        }
    }, [instanceId, router]);

    // Initial load
    useEffect(() => {
        fetchQuestions(1); // Real stage comes from backend
    }, [fetchQuestions]);

    // Timer tick
    useEffect(() => {
        if (timeLeft <= 0 || loading || showNextModal) return;

        const interval = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(interval);
                    handleTimeUp();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft, loading, showNextModal, answers, stage]);

    const handleTimeUp = async () => {
        if (timeUp || submitting) return;
        setTimeUp(true);
        // Force submit current stage and advance until finish
        await submitAnswers(true);
    };

    // Autosave mechanism
    const saveAnswersToBackend = async (showSaving = true) => {
        if (showSaving) setSaveStatus('saving');

        const payload = Object.keys(answers).map(qid => ({
            question_id: qid,
            answer_text: answers[qid].answer_text,
            selected_option_id: answers[qid].selected_option_id,
        }));

        try {
            const res = await fetch(`/api/test/${instanceId}/answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: payload, advance_stage: false }),
            });
            if (res.ok) setSaveStatus('saved');
            else setSaveStatus('error');
        } catch {
            setSaveStatus('error');
        }
    };

    const handleAnswerChange = (questionId: string, value: string, type: 'text' | 'option') => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                answer_text: type === 'text' ? value : prev[questionId].answer_text,
                selected_option_id: type === 'option' ? value : prev[questionId].selected_option_id,
            }
        }));

        setSaveStatus('saving');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => saveAnswersToBackend(false), 1500);
    };

    const submitAnswers = async (advance: boolean) => {
        setSubmitting(true);
        const payload = Object.keys(answers).map(qid => ({
            question_id: qid,
            answer_text: answers[qid].answer_text,
            selected_option_id: answers[qid].selected_option_id,
        }));

        try {
            const res = await fetch(`/api/test/${instanceId}/answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: payload, advance_stage: advance }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.status === 'submitted') {
                    router.push(`/test/${instanceId}/complete`);
                } else if (data.status === 'in_progress' && advance) {
                    setShowNextModal(false);
                    fetchQuestions(data.current_stage);
                }
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to submit section.');
            }
        } catch {
            alert('Network error submitting. We saved your progress locally.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEndTest = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/test/${instanceId}/end`, { method: 'POST' });
            if (res.ok) {
                router.push(`/test/${instanceId}/complete`);
            } else {
                alert('Failed to end test.');
            }
        } catch {
            alert('Network error.');
        } finally {
            setSubmitting(false);
            setShowEndModal(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 bg-[#f5f6f8]">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
                    <h2 className="text-xl font-bold text-gray-900">Session Error</h2>
                    <p className="mt-2 text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (loading && questions.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
                <div className="flex flex-col items-center">
                    <svg className="h-8 w-8 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="mt-4 font-bold text-gray-500 uppercase tracking-widest text-xs">Loading Section {stage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
            {/* Top Bar - Persists */}
            <header className="sticky top-0 z-40 w-full border-b border-gray-200/60 bg-white/90 backdrop-blur shadow-sm">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 shadow-inner">
                            <span className="h-2 w-2 rounded-full animate-pulse bg-emerald-500"></span>
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Section {stage} of 3</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Autosave Indicator */}
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                            {saveStatus === 'saving' && <><svg className="w-3.5 h-3.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Saving...</>}
                            {saveStatus === 'saved' && <><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> <span className="text-emerald-600">Saved</span></>}
                            {saveStatus === 'error' && <span className="text-red-500">Failed to save</span>}
                        </div>

                        {/* Timer */}
                        <div className={`font-mono text-xl font-black tabular-nums transition-colors ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 pb-32">
                <div className="space-y-8">
                    {questions.map((q, idx) => {
                        const ans = answers[q.id] || { answer_text: '', selected_option_id: '' };
                        const showOptions = q.question_type === 'mcq' || q.question_type === 'hybrid_choice_justification';
                        const showTextarea = q.question_type === 'short_structured' || q.question_type === 'hybrid_choice_justification';

                        return (
                            <div key={q.id} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="text-xs font-black tracking-widest text-emerald-600">QUESTION {(stage - 1) * 4 + idx + 1}</span>
                                    {q.char_limit && showTextarea && (
                                        <span className={`text-[10px] font-bold uppercase ${ans.answer_text.length > q.char_limit ? 'text-red-600' : 'text-gray-400'}`}>
                                            {ans.answer_text.length} / {q.char_limit} chars
                                        </span>
                                    )}
                                </div>
                                <h2 className="mb-6 text-xl font-medium leading-relaxed text-gray-900">{q.prompt_text}</h2>

                                {showOptions && (
                                    <div className="mb-6 space-y-3">
                                        {q.options.map(opt => (
                                            <label
                                                key={opt.id}
                                                onClick={() => handleAnswerChange(q.id, opt.id, 'option')}
                                                className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all ${ans.selected_option_id === opt.id
                                                    ? 'border-emerald-500 bg-emerald-50/50 shadow-inner'
                                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${ans.selected_option_id === opt.id ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                                                    }`}>
                                                    {ans.selected_option_id === opt.id && <div className="h-2 w-2 rounded-full bg-white" />}
                                                </div>
                                                <span className={`text-sm ${ans.selected_option_id === opt.id ? 'font-semibold text-emerald-900' : 'text-gray-700'}`}>
                                                    {opt.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {showTextarea && (
                                    <div className="relative">
                                        <textarea
                                            value={ans.answer_text}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value, 'text')}
                                            placeholder="Type your answer here..."
                                            className={`min-h-[160px] w-full resize-y rounded-xl border-2 bg-gray-50/50 p-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 ${q.char_limit && ans.answer_text.length > q.char_limit ? 'border-red-400' : 'border-gray-200 focus:border-emerald-400'
                                                }`}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Bottom Actions Bar - Fixed */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 p-4 backdrop-blur shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-2">
                    <button
                        onClick={() => setShowEndModal(true)}
                        className="rounded-lg px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                        End Test Early
                    </button>
                    <button
                        onClick={() => {
                            if (!hasSeenNextWarning && stage < 3) {
                                setShowNextModal(true);
                            } else {
                                submitAnswers(true);
                            }
                        }}
                        disabled={submitting}
                        className={`rounded-xl px-8 py-3.5 text-sm font-black text-white shadow-xl transition-all hover:shadow-gray-900/20 active:translate-y-[1px] ${submitting ? 'bg-emerald-600 opacity-90 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}`}
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                Loading...
                            </span>
                        ) : (stage === 3 ? 'Submit Final Answers' : 'Next Section →')}
                    </button>
                </div>
            </div>

            {/* WARNING MODAL (Next Section) */}
            {showNextModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[24px] bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-5">
                            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-center text-xl font-black text-gray-900">You cannot return to this section</h2>
                        <p className="mt-3 text-center text-sm font-medium text-gray-500 leading-relaxed">
                            Once you move forward you won't be able to return to these questions. Make sure you're comfortable with your answers.
                        </p>
                        <div className="mt-8 flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setHasSeenNextWarning(true);
                                    submitAnswers(true);
                                }}
                                disabled={submitting}
                                className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Saving...' : 'Proceed to next section'}
                            </button>
                            <button
                                onClick={() => setShowNextModal(false)}
                                disabled={submitting}
                                className="w-full rounded-xl py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Continue working
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* END MODAL (Early End) */}
            {showEndModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[24px] bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-5">
                            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-center text-xl font-black text-gray-900">Are you sure you want to end the test?</h2>
                        <p className="mt-3 text-center text-sm font-medium text-gray-500">
                            You won't be able to continue. Your current progress will be submitted as-is.
                        </p>
                        <div className="mt-8 flex flex-col gap-3">
                            <button
                                onClick={handleEndTest}
                                disabled={submitting}
                                className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-black text-white shadow-lg hover:bg-red-700 transition-colors"
                            >
                                {submitting ? 'Ending test...' : 'End Test'}
                            </button>
                            <button
                                onClick={() => setShowEndModal(false)}
                                disabled={submitting}
                                className="w-full rounded-xl py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
