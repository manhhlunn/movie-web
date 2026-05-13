import { Movie } from "@/domain/entities/Movie";

const FAVORITES_KEY = "user_favorites";
const HISTORY_KEY = "user_history";
const MAX_HISTORY = 50;

export const getFavorites = (): Movie[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(FAVORITES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const toggleFavorite = (movie: Movie): boolean => {
  const favorites = getFavorites();
  const index = favorites.findIndex((m) => m.slug === movie.slug);
  let isAdded = false;

  if (index > -1) {
    favorites.splice(index, 1);
    isAdded = false;
  } else {
    // Only store essential fields to save space
    const { id, name, slug, posterUrl, thumbUrl, quality, year, lang, episodeCurrent } = movie;
    favorites.unshift({ id, name, slug, posterUrl, thumbUrl, quality, year, lang, episodeCurrent } as Movie);
    isAdded = true;
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return isAdded;
};

export const isFavorite = (slug: string): boolean => {
  const favorites = getFavorites();
  return favorites.some((m) => m.slug === slug);
};

export const getHistory = (): Movie[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const addToHistory = (movie: Movie) => {
  const history = getHistory();
  const index = history.findIndex((m) => m.slug === movie.slug);

  if (index > -1) {
    history.splice(index, 1);
  }

  const { id, name, slug, posterUrl, thumbUrl, quality, year, lang, episodeCurrent } = movie;
  history.unshift({ id, name, slug, posterUrl, thumbUrl, quality, year, lang, episodeCurrent } as Movie);

  if (history.length > MAX_HISTORY) {
    history.pop();
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const removeFromHistory = (slug: string) => {
  const history = getHistory();
  const filtered = history.filter((m) => m.slug !== slug);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
};
