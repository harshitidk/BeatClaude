'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardHeaderProps {
    userEmail?: string;
    onCreateJob: () => void;
    creating?: boolean;
}

export default function DashboardHeader({ userEmail, onCreateJob, creating }: DashboardHeaderProps) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-200">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude</span>
                </Link>

                {/* Right side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCreateJob}
                        disabled={creating}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-300"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {creating ? 'Creating...' : 'Create New Job'}
                    </button>

                    {/* User avatar */}
                    <div className="relative group">
                        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-bold text-gray-600 ring-2 ring-white shadow-sm hover:ring-blue-200 transition-all">
                            {userEmail ? userEmail[0].toUpperCase() : 'U'}
                        </button>
                        {/* Dropdown */}
                        <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-2 shadow-xl shadow-gray-200/50 transition-all duration-200">
                            <p className="px-4 py-2 text-xs text-gray-400 truncate">{userEmail}</p>
                            <hr className="my-1 border-gray-100" />
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
