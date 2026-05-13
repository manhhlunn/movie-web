import Link from 'next/link';
import { Film } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-sm max-w-md w-full">
        <Film className="w-16 h-16 mx-auto mb-6 text-primary" />
        <h1 className="text-6xl font-bold font-outfit mb-2 text-white">404</h1>
        <h2 className="text-2xl font-semibold mb-4 text-zinc-200">Không tìm thấy trang</h2>
        <p className="text-zinc-400 mb-8">
          Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc tạm thời không thể truy cập.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
