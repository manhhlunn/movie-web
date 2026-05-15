/**
 * Domain Entities — Clean, framework-agnostic data structures
 * representing the core business objects of the application.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Country {
  id: string;
  name: string;
  slug: string;
}

export interface FilterOption {
  _id: string;
  name: string;
  slug: string;
}

export interface Episode {
  name: string;
  slug: string;
  filename: string;
  linkEmbed: string;
  linkM3u8: string;
}

export interface ServerData {
  serverName: string;
  episodes: Episode[];
}

export interface Movie {
  id: string;
  name: string;
  slug: string;
  originName: string;
  type: 'single' | 'series' | 'hoathinh' | 'tvshows';
  posterUrl: string;
  thumbUrl: string;
  year: number;
  quality: string;
  lang: string;
  episodeCurrent: string;
  episodeTotal: string;
  time: string;
  description: string;
  categories: Category[];
  countries: Country[];
  actors: string[];
  directors: string[];
  tmdbVoteAverage: number;
  imdbRating: number;
  imdbId: string;
  imdbVoteCount: number;
  tmdb?: {
    type: 'movie' | 'tv';
    id: string;
    season?: number;
    voteAverage?: number;
    voteCount?: number;
  };
  /** Only available in detail responses */
  servers?: ServerData[];
  /** Trailer URL if available */
  trailerUrl?: string;
  /** Last modified timestamp */
  modifiedTime?: string;
  /** Watch progress fields */
  lastEpisodeSlug?: string;
  lastTime?: number;
}

export interface MovieListResult {
  items: Movie[];
  pagination: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
  /** CDN base URL for images */
  cdnImageDomain: string;
}
