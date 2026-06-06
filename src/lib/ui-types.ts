export type BookRecord = {
  id: string;
  title: string;
  description: string | null;
  isbn: string | null;
  genre: string;
  publishedYear: number | null;
  pages: number | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthorRecord = {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  nationality: string | null;
  birthYear: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthorWithBooks = AuthorRecord & {
  books: BookRecord[];
  _count?: {
    books: number;
  };
};

export type BookWithAuthor = BookRecord & {
  author: Pick<AuthorRecord, "id" | "name" | "email">;
};

export type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type BookSearchResponse = {
  data: BookWithAuthor[];
  pagination: PaginationState;
};

export type AuthorStats = {
  authorId: string;
  authorName: string;
  totalBooks: number;
  firstBook: {
    title: string;
    year: number | null;
  } | null;
  latestBook: {
    title: string;
    year: number | null;
  } | null;
  averagePages: number;
  genres: string[];
  longestBook: {
    title: string;
    pages: number | null;
  } | null;
  shortestBook: {
    title: string;
    pages: number | null;
  } | null;
};
