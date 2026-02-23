'use client';

import Link from 'next/link';

export default function Header() {
    return (
        <header className="w-full border-b border-gray-100 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 2L6 8V18L16 30L26 18V8L16 2Z" fill="#2563EB" />
                        <path d="M16 2L6 8V18L16 22V2Z" fill="#1D4ED8" />
                        <path d="M12 14L16 10L20 14L16 22L12 14Z" fill="white" />
                    </svg>
                    <span className="text-lg font-bold text-gray-900 tracking-tight">Beat Claude</span>
                </Link>

            </div>
        </header>
    );
}
