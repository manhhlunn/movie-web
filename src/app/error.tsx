'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-zinc-900/50 p-8 rounded-2xl border border-red-900/30 backdrop-blur-sm max-w-md w-full">
        <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
        <h1 className="text-3xl font-bold font-outfit mb-4 text-white">Đã xảy ra lỗi!</h1>
        <p className="text-zinc-400 mb-8">
          Rất tiếc, đã có lỗi xảy ra trong quá trình xử lý yêu cầu của bạn. Vui lòng thử lại sau.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Thử lại
          </button>
          <Link 
            href="/" 
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
