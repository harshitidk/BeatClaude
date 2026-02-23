'use client';

interface EmptyStateProps {
    onCreateJob: () => void;
    creating?: boolean;
}

export default function EmptyState({ onCreateJob, creating }: EmptyStateProps) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
            {/* Illustration */}
            <div className="relative mb-8">
                <div className="relative mx-auto h-48 w-56">
                    {/* Card background */}
                    <div className="absolute inset-4 rotate-2 rounded-2xl bg-white shadow-lg shadow-gray-200/60 border border-gray-100" />
                    <div className="absolute inset-4 -rotate-1 rounded-2xl bg-white shadow-xl shadow-gray-200/80 border border-gray-100">
                        {/* Card lines */}
                        <div className="p-6">
                            <div className="mb-3 h-3 w-16 rounded-full bg-gray-200" />
                            <div className="mb-2 h-2 w-24 rounded-full bg-gray-100" />
                            <div className="mb-5 h-2 w-20 rounded-full bg-gray-100" />
                            {/* Person icon */}
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7 text-blue-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    {/* Sparkle badge */}
                    <div className="absolute -right-2 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    {/* Checkmark badge */}
                    <div className="absolute -left-1 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 shadow-md shadow-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Text */}
            <h2 className="mb-3 text-2xl font-bold text-gray-900 tracking-tight">
                Create your first hiring assessment
            </h2>
            <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-gray-500">
                Set up your role requirements and let our AI companion help you find the best talent.
                Your dashboard will populate with candidate insights once the assessment is live.
            </p>

            {/* CTA */}
            <button
                onClick={onCreateJob}
                disabled={creating}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                {creating ? 'Creating...' : 'Create your first job'}
            </button>

            {/* Walkthrough link */}
            <button className="mt-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                </svg>
                Watch a 2-minute walkthrough
            </button>
        </div>
    );
}
