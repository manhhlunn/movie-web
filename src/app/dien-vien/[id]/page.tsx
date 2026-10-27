import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Film, ArrowLeft, Clapperboard, Sparkles } from 'lucide-react';
import { getActorMovies } from '@/application/useCases/ActorUseCases';
import MovieCard from '@/presentation/components/MovieCard';
import ActorPhotoGallery from '@/presentation/components/ActorPhotoGallery';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sParams = await searchParams;
  const rawName = sParams.name;
  const name = typeof rawName === 'string' ? rawName : 'Diễn viên';

  return {
    title: `Phim của diễn viên ${name}`,
    description: `Danh sách các bộ phim có sự tham gia của diễn viên ${name} mới nhất, chất lượng cao Vietsub Thuyết minh tại MovieWeb.`,
  };
}

export default async function ActorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sParams = await searchParams;
  const rawName = sParams.name;
  const fallbackName = typeof rawName === 'string' ? rawName : undefined;

  const { person, movies } = await getActorMovies(id, fallbackName);

  return (
    <div className="container py-24 min-h-screen">
      {/* Nút quay lại */}
      <Link
        href="/"
        prefetch={false}
        className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span>Quay lại trang chủ</span>
      </Link>

      {/* Header Profile Diễn viên */}
      <div className="relative mb-12 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden flex-shrink-0 border-3 border-red-500 shadow-2xl bg-zinc-800 ring-4 ring-red-500/20">
            {person.profileUrl ? (
              <Image
                src={person.profileUrl}
                alt={person.name}
                fill
                sizes="(max-width: 640px) 112px, 144px"
                quality={85}
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-500 bg-zinc-800">
                {person.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Thông tin */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md bg-red-600/20 text-red-400 border border-red-500/30">
                Diễn viên
              </span>
              <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50 flex items-center gap-1">
                <Clapperboard className="w-3 h-3 text-red-500" />
                {movies.length} phim có sẵn
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold font-outfit uppercase tracking-tight text-white">
              {person.name}
            </h1>

            {person.originalName && person.originalName !== person.name && (
              <p className="text-sm text-zinc-400 italic">
                Tên khác: {person.originalName}
              </p>
            )}

            {(person.birthday || person.placeOfBirth) && (
              <p className="text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start">
                {person.birthday && <span>🎂 Sinh: {person.birthday}</span>}
                {person.placeOfBirth && <span>📍 Nơi sinh: {person.placeOfBirth}</span>}
              </p>
            )}

            {person.biography && (
              <p className="text-xs sm:text-sm text-zinc-400/90 line-clamp-3 md:line-clamp-4 leading-relaxed max-w-4xl pt-1">
                {person.biography}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bộ sưu tập hình ảnh diễn viên */}
      {person.images && person.images.length > 0 && (
        <ActorPhotoGallery name={person.name} images={person.images} />
      )}

      {/* Tiêu đề danh sách phim */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/80">
        <h2 className="text-2xl md:text-3xl font-bold font-outfit uppercase tracking-tight flex items-center gap-2">
          <Film className="w-6 h-6 text-red-500" />
          Phim đã tham gia
          <span className="text-sm font-normal text-zinc-400 lowercase ml-2">
            ({movies.length} phim)
          </span>
        </h2>
      </div>

      {/* Lưới phim y hệt các danh sách có sẵn */}
      {movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30">
          <div className="w-16 h-16 rounded-full bg-zinc-800/60 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Chưa có bản xem cho diễn viên này</h3>
          <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
            Hệ thống hiện chưa tìm thấy bản phim vietsub nào có sẵn của <span className="text-zinc-200 font-semibold">{person.name}</span>. Bạn có thể quay lại trang chủ để khám phá nhiều phim hấp dẫn khác.
          </p>
          <Link
            href="/"
            prefetch={false}
            className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all shadow-lg shadow-red-600/30"
          >
            Khám phá phim khác
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id || movie.slug} movie={movie} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
