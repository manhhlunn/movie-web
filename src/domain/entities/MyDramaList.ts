/**
 * Domain entities & DTOs for resolving MyDramaList (MDL) title slugs & review links.
 */

export interface MdlSearchCandidate {
  id: string;
  path: string;
  url: string;
  reviewsUrl: string;
  title: string;
  typeLabel: string;
  year?: number;
  episodes?: number;
  rating?: number;
  posterUrl?: string;
  matchScore?: number;
}

export interface MdlSearchResponse {
  ok: boolean;
  error?: string;
  queriesTried: string[];
  bestMatch: MdlSearchCandidate | null;
  reviewUrl: string | null;
  fallbackSearchUrl: string;
  candidates: MdlSearchCandidate[];
}
