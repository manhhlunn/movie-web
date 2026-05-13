'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, X, Menu, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/danh-sach/phim-moi-cap-nhat', label: 'Phim mới' },
  { href: '/danh-sach/phim-le', label: 'Phim lẻ' },
  { href: '/danh-sach/phim-bo', label: 'Phim bộ' },
  { href: '/danh-sach/hoat-hinh', label: 'Hoạt hình' },
  { href: '/danh-sach/tv-shows', label: 'TV Shows' },
  { href: '/yeu-thich', label: 'Yêu thích' },
  { href: '/lich-su', label: 'Lịch sử' },
];

const MORE_LINKS = [
  { href: '/danh-sach/phim-vietsub', label: 'Phim Vietsub' },
  { href: '/danh-sach/phim-thuyet-minh', label: 'Phim Thuyết Minh' },
  { href: '/danh-sach/phim-long-tieng', label: 'Phim Lồng Tiếng' },
  { href: '/danh-sach/phim-bo-dang-chieu', label: 'Phim Đang Chiếu' },
  { href: '/danh-sach/phim-bo-hoan-thanh', label: 'Phim Hoàn Thành' },
  { href: '/danh-sach/phim-sap-chieu', label: 'Phim Sắp Chiếu' },
  { href: '/danh-sach/subteam', label: 'Subteam' },
  { href: '/danh-sach/phim-chieu-rap', label: 'Phim Chiếu Rạp' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tim-kiem?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-black/95 backdrop-blur-xl shadow-2xl shadow-red-900/10'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
      )}
    >
      <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="relative">
              <Film className="w-8 h-8 text-red-600 transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-red-600/30 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tighter text-white">
              M<span className="text-red-600">PHIM</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-lg',
                    isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-white/10 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
            {/* Dropdown Menu */}
            <div 
              className="relative ml-2"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button
                className={cn(
                  'flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-lg',
                  MORE_LINKS.some(link => pathname === link.href)
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                <span className="relative z-10">Khám Phá</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", dropdownOpen ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-2"
                  >
                    {MORE_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setDropdownOpen(false)}
                        className={cn(
                          'block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-800',
                          pathname === link.href ? 'text-white bg-zinc-800/50' : 'text-zinc-400'
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Search + Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <AnimatePresence>
              {searchOpen ? (
                <motion.form
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  exit={{ scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSearch}
                  className="absolute inset-x-0 top-0 h-full bg-black z-20 flex items-center px-4 md:relative md:inset-auto md:bg-transparent md:w-[280px] md:px-0 origin-right"
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm phim..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-full py-2 pl-4 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none md:bg-zinc-900/90"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="absolute right-7 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </motion.form>
              ) : (
                <motion.button
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  onClick={() => setSearchOpen(true)}
                  className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Tìm kiếm"
                >
                  <Search className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden border-t border-zinc-800/50"
            >
              <div className="py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      pathname === link.href
                        ? 'text-white bg-white/10'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Khám phá thêm
                </div>
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block px-4 py-3 rounded-lg text-sm font-medium transition-colors ml-4 border-l border-zinc-800',
                      pathname === link.href
                        ? 'text-white border-red-500 bg-white/5'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
