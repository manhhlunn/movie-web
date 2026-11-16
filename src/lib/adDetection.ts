export interface AdRange {
  start: number;
  end: number;
  duration: number;
}

export interface FragmentLike {
  relurl?: string;
  url?: string;
  start: number;
  duration: number;
  sn?: number | 'initSegment';
}

interface AdBlock {
  range: AdRange;
  firstIdx: number;
  lastIdx: number;
}

/**
 * Kiểm tra xem một dòng URI segment trong playlist HLS có phải là phân đoạn quảng cáo chèn hay không.
 */
export function isAdSegment(line: string): boolean {
  if (!line) return false;
  const clean = line.trim();
  if (clean.startsWith('#')) return false;
  // Bỏ qua các phân đoạn sửa lỗi phim của CDN (convertv8, convertv9...)
  if (/convertv\d*/i.test(clean)) return false;

  // 1. Phù hợp định dạng /v8/hash/segment_0001.ts hoặc /v[0-9]+/hash/segment_...
  if (/\/v\d+\/[a-f0-9]{10,}\/segment_\d+\.ts/i.test(clean)) return true;
  // 2. Định dạng segment_0001.ts với đường dẫn tuyệt đối hoặc chứa /v
  if (/\/segment_\d+\.ts/i.test(clean) && (clean.startsWith('/') || clean.includes('/v'))) return true;
  // 3. Các từ khoá quảng cáo trong đường dẫn
  if (/(\/|\b)(ads?|advert|qc|quangcao|midroll|preroll)\b/i.test(clean)) return true;

  return false;
}

function extractAdBlocks(fragments: readonly FragmentLike[]): AdBlock[] {
  const blocks: AdBlock[] = [];
  let cur: AdBlock | null = null;

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    if (!frag || frag.sn === 'initSegment') continue;
    if (!Number.isFinite(frag.start) || !Number.isFinite(frag.duration)) continue;

    const segUrl = frag.relurl || frag.url || '';
    if (isAdSegment(segUrl)) {
      const fEnd = frag.start + frag.duration;
      if (!cur) {
        cur = {
          range: { start: frag.start, end: fEnd, duration: frag.duration },
          firstIdx: i,
          lastIdx: i,
        };
      } else {
        cur.range.end = fEnd;
        cur.range.duration = cur.range.end - cur.range.start;
        cur.lastIdx = i;
      }
    } else if (cur) {
      blocks.push(cur);
      cur = null;
    }
  }

  if (cur) {
    blocks.push(cur);
  }

  return blocks;
}

/**
 * Trích xuất các khoảng thời gian quảng cáo liên tiếp từ danh sách fragment của hls.js.
 */
export function extractAdRangesFromFragments(fragments: readonly FragmentLike[]): AdRange[] {
  return extractAdBlocks(fragments).map((b) => b.range);
}

/**
 * Tìm khoảng quảng cáo liên tiếp chứa fragment mục tiêu.
 */
export function findAdRangeForFragment(
  fragments: readonly FragmentLike[],
  targetFrag: FragmentLike
): AdRange | null {
  const blocks = extractAdBlocks(fragments);
  if (blocks.length === 0) return null;

  if (typeof targetFrag.sn === 'number') {
    const bySn = blocks.find((b) => {
      for (let i = b.firstIdx; i <= b.lastIdx; i++) {
        if (fragments[i]?.sn === targetFrag.sn) return true;
      }
      return false;
    });
    if (bySn) return bySn.range;
  }

  return (
    blocks.find(
      (b) => targetFrag.start >= b.range.start - 1 && targetFrag.start <= b.range.end + 1
    )?.range ?? null
  );
}

/**
 * Tính thời điểm đích khi tua qua một khoảng quảng cáo, căn theo fragment phim kế tiếp nếu có.
 */
export function getSkipTargetForAdRange(
  fragments: readonly FragmentLike[] | undefined,
  range: AdRange,
  videoDuration: number
): number {
  if (fragments && fragments.length > 0) {
    const blocks = extractAdBlocks(fragments);
    const matched = blocks.find(
      (b) => Math.abs(b.range.start - range.start) < 1 && Math.abs(b.range.end - range.end) < 1
    ) ?? blocks.find((b) => range.start <= b.range.end && range.end >= b.range.start);

    if (matched) {
      let nextFrag: FragmentLike | undefined;
      for (let i = matched.lastIdx + 1; i < fragments.length; i++) {
        const candidate = fragments[i];
        if (candidate && candidate.sn !== 'initSegment' && !isAdSegment(candidate.relurl || candidate.url || '')) {
          nextFrag = candidate;
          break;
        }
      }

      if (nextFrag && Number.isFinite(nextFrag.start)) {
        return Math.max(matched.range.end + 0.1, nextFrag.start + 0.05);
      }

      // Quảng cáo ở cuối video: không vượt quá duration hiện tại
      return videoDuration > 0 ? Math.min(matched.range.end, videoDuration) : matched.range.end;
    }
  }

  return range.end + 0.1;
}

/**
 * So sánh 2 danh sách AdRange với ngưỡng sai số cho trước (giây).
 */
export function areAdRangesChanged(
  prev: readonly AdRange[],
  next: readonly AdRange[],
  tolerance: number
): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    if (
      Math.abs(prev[i].start - next[i].start) > tolerance ||
      Math.abs(prev[i].end - next[i].end) > tolerance
    ) {
      return true;
    }
  }
  return false;
}
