import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full border-t border-gray-100 bg-white py-8 mt-auto">
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
                    <Link
                        href="#"
                        className="text-xs font-medium tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        PRIVACY POLICY
                    </Link>
                    <Link
                        href="#"
                        className="text-xs font-medium tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        TERMS OF SERVICE
                    </Link>
                    <Link
                        href="#"
                        className="text-xs font-medium tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        SECURITY
                    </Link>
                    <Link
                        href="#"
                        className="text-xs font-medium tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        STATUS
                    </Link>
                </div>
                <p className="text-center text-xs text-gray-400">
                    © 2026 Beat Claude AI. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
