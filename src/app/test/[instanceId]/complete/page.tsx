'use client';

import { useParams, useRouter } from 'next/navigation';

export default function TestCompletePage() {
    const params = useParams();
    const router = useRouter();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f6f8] px-6">
            <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-xl shadow-emerald-900/5">
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-inner">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">You're All Set!</h1>
                <p className="text-base font-medium text-gray-500 leading-relaxed mb-10">
                    Your assessment has been successfully submitted. The hiring team has been notified and will review your responses shortly. You can close this tab now.
                </p>

                <button
                    onClick={() => window.close()}
                    className="w-full rounded-2xl bg-gray-900 px-6 py-4 text-sm font-black text-white hover:bg-gray-800 transition-colors shadow-lg"
                >
                    Close Window
                </button>
            </div>

            <p className="mt-8 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400">
                Powered by
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                </span>
                Beat Claude
            </p>
        </div>
    );
}
