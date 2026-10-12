'use client';

import { useState, useEffect } from 'react';
import { User, UserCheck, X, Copy, Check, LogOut, Cloud, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserId, setUserId } from '@/lib/syncHistory';

export default function UserSyncModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [inputId, setInputId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateId = () => {
      const id = getUserId();
      setCurrentId(id);
    };

    updateId();
    window.addEventListener('movie-user-changed', updateId);
    return () => window.removeEventListener('movie-user-changed', updateId);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputId.trim();
    if (!trimmed) {
      setError('Vui lòng nhập ID hợp lệ.');
      return;
    }
    if (trimmed.length < 2) {
      setError('ID phải có ít nhất 2 ký tự.');
      return;
    }
    setError(null);
    setUserId(trimmed);
    setCurrentId(trimmed);
    setInputId('');
    setIsOpen(false);
  };

  const handleLogout = () => {
    if (confirm('Bạn có muốn đăng xuất khỏi ID này? Sau khi đăng xuất, lịch sử xem sẽ quay lại chế độ lưu trên bộ nhớ máy này.')) {
      setUserId(null);
      setCurrentId(null);
      setIsOpen(false);
    }
  };

  const handleCopy = () => {
    if (currentId) {
      navigator.clipboard.writeText(currentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Trigger Button on Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 border border-zinc-700/60 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white"
        title={currentId ? `Đang kết nối: ${currentId}` : 'Đăng nhập ID đồng bộ'}
      >
        {currentId ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="max-w-[80px] sm:max-w-[120px] truncate font-mono text-emerald-300">
              {currentId}
            </span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Đăng nhập ID</span>
            <span className="sm:hidden">ID</span>
          </>
        )}
      </button>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {currentId ? 'Tài Khoản Đồng Bộ' : 'Đăng Nhập Bằng ID'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Lưu lịch sử trực tuyến trên Supabase Cloud
                  </p>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3.5 mb-5 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-yellow-300">Cơ chế lưu trữ: </span>
                  Khi nhập ID, toàn bộ lịch sử xem phim sẽ được lưu <strong>trực tiếp lên Supabase</strong> và không lưu trên bộ nhớ máy này. Bạn có thể dùng chung ID trên máy tính, điện thoại để tiếp tục xem.
                </div>
              </div>

              {currentId ? (
                /* Already Logged In View */
                <div className="space-y-4">
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                      ID hiện tại của bạn
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base font-bold text-emerald-400 truncate">
                        {currentId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Form to change ID */}
                  <form onSubmit={handleLogin} className="space-y-3 pt-1">
                    <label className="text-xs text-zinc-400 block">
                      Hoặc chuyển sang một ID khác:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputId}
                        onChange={(e) => setInputId(e.target.value)}
                        placeholder="Nhập ID mới..."
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-red-500 transition-colors font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                      >
                        Đổi ID
                      </button>
                    </div>
                  </form>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors py-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất (Dùng lại bộ nhớ máy)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : (
                /* Login Form View */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Nhập ID của bạn
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={inputId}
                      onChange={(e) => {
                        setInputId(e.target.value);
                        setError(null);
                      }}
                      placeholder="Ví dụ: manh123 hoặc phone..."
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors font-mono"
                    />
                    {error && (
                      <p className="text-red-400 text-xs mt-1.5">{error}</p>
                    )}
                    <p className="text-[11px] text-zinc-500 mt-2">
                      💡 Mẹo: Bạn có thể nhập bất kỳ tên hoặc mã định danh nào để dùng chung giữa các thiết bị.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-red-600/30"
                    >
                      Xác Nhận & Đồng Bộ
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
