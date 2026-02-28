'use client';

import { useState } from 'react';

interface EmptyStateProps {
    onSubmitJd: (description: string) => Promise<void>;
}

export default function EmptyState({ onSubmitJd }: EmptyStateProps) {
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [parseStatus, setParseStatus] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!description.trim()) {
            setError('Please paste a job description before continuing.');
            return;
        }

        setError('');
        setSubmitting(true);
        setParseStatus('Creating job...');

        try {
            await onSubmitJd(description.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
            setParseStatus('');
        }
    };

    return (
        <main className="mx-auto w-full max-w-3xl px-6 py-10">
            {/* Welcome heading */}
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg shadow-emerald-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="h-7 w-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Drop a new role! 🚀
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 max-w-md mx-auto">
                    Just drop your JD below. We'll brew up the perfect interview questions while you sip your coffee. ☕️
                </p>
            </div>

            {/* JD Input Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                {/* Error */}
                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Label row */}
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                        Put in the JD here
                    </label>
                    <span className="text-xs italic text-gray-400">Format: Plain text or Markdown</span>
                </div>

                {/* Textarea */}
                <div className="relative mt-2">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={`Paste that chunky text right here! ✨`}
                        rows={10}
                        disabled={submitting}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-sm leading-relaxed text-gray-700 placeholder:text-gray-400/70 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all disabled:opacity-50"
                    />
                    {/* Send icon */}
                    <div className="absolute bottom-4 right-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-gray-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all hover:shadow-lg"
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
                                Analyze & Create Assessment
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
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-emerald-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                        ),
                        title: 'AI MAGIC 🪄',
                        desc: 'Skills extraction on autopilot.',
                    },
                    {
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-emerald-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        ),
                        title: 'FORT KNOX 🔒',
                        desc: 'Your data is locked down tight.',
                    },
                    {
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-emerald-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ),
                        title: 'SUPER FAST ⚡️',
                        desc: 'Blink and it\'s ready.',
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
    );
}
