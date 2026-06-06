"use client";

import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react";

import { requestJson } from "@/lib/http";
import type {
  AuthorWithBooks,
  BookSearchResponse,
  BookWithAuthor,
  PaginationState,
} from "@/lib/ui-types";

type BookFormState = {
  title: string;
  description: string;
  isbn: string;
  publishedYear: string;
  genre: string;
  pages: string;
  authorId: string;
};

const emptyBookForm: BookFormState = {
  title: "",
  description: "",
  isbn: "",
  publishedYear: "",
  genre: "",
  pages: "",
  authorId: "",
};

const emptyPagination: PaginationState = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const sortOptions = [
  { value: "createdAt", label: "Fecha de creación" },
  { value: "title", label: "Título" },
  { value: "publishedYear", label: "Año de publicación" },
] as const;

function getBookForm(book: BookWithAuthor): BookFormState {
  return {
    title: book.title,
    description: book.description ?? "",
    isbn: book.isbn ?? "",
    publishedYear: book.publishedYear?.toString() ?? "",
    genre: book.genre,
    pages: book.pages?.toString() ?? "",
    authorId: book.authorId,
  };
}

export function BooksWorkbench() {
  const [authors, setAuthors] = useState<AuthorWithBooks[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [books, setBooks] = useState<BookWithAuthor[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(emptyPagination);
  const [form, setForm] = useState<BookFormState>(emptyBookForm);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>(
    "createdAt",
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPaging, startTransition] = useTransition();

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [authorsData, booksData] = await Promise.all([
          requestJson<AuthorWithBooks[]>("/api/authors"),
          requestJson<BookWithAuthor[]>("/api/books"),
        ]);

        if (cancelled) {
          return;
        }

        setAuthors(authorsData);
        setGenres(
          [...new Set(booksData.map((book) => book.genre))].sort((a, b) =>
            a.localeCompare(b),
          ),
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los datos base.",
        );
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const authorName = authorFilter
          ? authors.find((author) => author.id === authorFilter)?.name ?? ""
          : "";

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          sortBy,
          order,
        });

        if (deferredSearch.trim()) {
          params.set("search", deferredSearch.trim());
        }

        if (genreFilter) {
          params.set("genre", genreFilter);
        }

        if (authorName) {
          params.set("authorName", authorName);
        }

        const response = await requestJson<BookSearchResponse>(
          `/api/books/search?${params.toString()}`,
        );

        if (cancelled) {
          return;
        }

        setBooks(response.data);
        setPagination(response.pagination);
        setSearchError(null);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setSearchError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron obtener los libros.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [authorFilter, authors, deferredSearch, genreFilter, order, page, sortBy]);

  async function refreshCatalog(message?: string) {
    setLoading(true);
    setLoadingOptions(true);

    try {
      const [authorsData, booksData] = await Promise.all([
        requestJson<AuthorWithBooks[]>("/api/authors"),
        requestJson<BookWithAuthor[]>("/api/books"),
      ]);

      setAuthors(authorsData);
      setGenres(
        [...new Set(booksData.map((book) => book.genre))].sort((a, b) =>
          a.localeCompare(b),
        ),
      );
      setFeedback(message ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los datos base.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      await requestJson(editingBookId ? `/api/books/${editingBookId}` : "/api/books", {
        method: editingBookId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });

      startTransition(() => {
        setEditingBookId(null);
        setForm(emptyBookForm);
      });

      await refreshCatalog(
        editingBookId
          ? "Libro actualizado correctamente."
          : "Libro creado correctamente.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el libro.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(bookId: string) {
    if (!window.confirm("¿Seguro que quieres eliminar este libro?")) {
      return;
    }

    setDeletingId(bookId);
    setError(null);
    setFeedback(null);

    try {
      await requestJson(`/api/books/${bookId}`, { method: "DELETE" });

      if (editingBookId === bookId) {
        startTransition(() => {
          setEditingBookId(null);
          setForm(emptyBookForm);
        });
      }

      await refreshCatalog("Libro eliminado correctamente.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo eliminar el libro.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page-shell space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-white/10 bg-[#101827] p-8 text-white shadow-[0_28px_90px_-36px_rgba(15,23,42,0.9)]">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#fbbf24]">
            Explorador de libros
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Busca, filtra y ordena el catálogo con paginación real.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            La búsqueda responde al título, género y autor. También puedes crear
            o editar libros desde el mismo panel.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Resultados
            </p>
            <p className="mt-3 text-4xl font-semibold">{pagination.total}</p>
            <p className="mt-2 text-sm text-white/65">
              Coincidencias para los filtros actuales.
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Página actual
            </p>
            <p className="mt-3 text-4xl font-semibold">{pagination.page}</p>
            <p className="mt-2 text-sm text-white/65">
              {pagination.totalPages} páginas disponibles.
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Autores
            </p>
            <p className="mt-3 text-4xl font-semibold">{authors.length}</p>
            <p className="mt-2 text-sm text-white/65">
              Usados para el selector del formulario y filtro.
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Géneros
            </p>
            <p className="mt-3 text-4xl font-semibold">{genres.length}</p>
            <p className="mt-2 text-sm text-white/65">
              Valores únicos detectados en el catálogo.
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">
                Editor de libro
              </p>
              <h2 className="mt-2 section-title">
                {editingBookId ? "Editar libro" : "Nuevo libro"}
              </h2>
              <p className="mt-2 section-copy">
                Usa el selector de autor y completa los metadatos básicos.
              </p>
            </div>

            {editingBookId ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  startTransition(() => {
                    setEditingBookId(null);
                    setForm(emptyBookForm);
                  });
                }}
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="book-title">
                Título
              </label>
              <input
                id="book-title"
                className="field"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Cien años de soledad"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="book-author">
                Autor
              </label>
              <select
                id="book-author"
                className="field"
                value={form.authorId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, authorId: event.target.value }))
                }
                disabled={loadingOptions || authors.length === 0}
                required
              >
                <option value="">Selecciona un autor</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="book-genre">
                  Género
                </label>
                <input
                  id="book-genre"
                  className="field"
                  value={form.genre}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, genre: event.target.value }))
                  }
                  placeholder="Novela"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="book-isbn">
                  ISBN
                </label>
                <input
                  id="book-isbn"
                  className="field"
                  value={form.isbn}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isbn: event.target.value }))
                  }
                  placeholder="978-0307474728"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="book-year">
                  Año de publicación
                </label>
                <input
                  id="book-year"
                  className="field"
                  value={form.publishedYear}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      publishedYear: event.target.value,
                    }))
                  }
                  placeholder="1967"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="book-pages">
                  Páginas
                </label>
                <input
                  id="book-pages"
                  className="field"
                  value={form.pages}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, pages: event.target.value }))
                  }
                  placeholder="417"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="book-description">
                Descripción
              </label>
              <textarea
                id="book-description"
                className="textarea"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Resumen breve del libro."
              />
            </div>

            {feedback ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {feedback}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              className="button-primary w-full"
              disabled={submitting || authors.length === 0}
              type="submit"
            >
              {submitting
                ? "Guardando..."
                : editingBookId
                  ? "Actualizar libro"
                  : "Crear libro"}
            </button>
          </form>
        </aside>

        <section className="panel p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">
                Búsqueda avanzada
              </p>
              <h2 className="mt-2 section-title">Catálogo filtrado</h2>
              <p className="mt-2 section-copy">
                La búsqueda por título es parcial e insensible a mayúsculas.
              </p>
            </div>

            <span className="chip">
              {loading ? "Buscando..." : `${pagination.total} resultados`}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              className="field xl:col-span-2"
              value={search}
              onChange={(event) => {
                setLoading(true);
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por título..."
            />

            <select
              className="field"
              value={genreFilter}
              onChange={(event) => {
                setLoading(true);
                setGenreFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los géneros</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>

            <select
              className="field"
              value={authorFilter}
              onChange={(event) => {
                setLoading(true);
                setAuthorFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los autores</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <select
                className="field"
                value={sortBy}
                onChange={(event) => {
                  setLoading(true);
                  setSortBy(
                    event.target.value as (typeof sortOptions)[number]["value"],
                  );
                  setPage(1);
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="field"
                value={order}
                onChange={(event) => {
                  setLoading(true);
                  setOrder(event.target.value as "asc" | "desc");
                  setPage(1);
                }}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>

          {searchError ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {searchError}
            </p>
          ) : null}

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse rounded-[26px] border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="panel-muted mt-6 p-6 text-sm text-slate-600">
              No hay libros para los filtros seleccionados.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {books.map((book) => (
                <article
                  key={book.id}
                  className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
                        {book.genre}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        {book.title}
                      </h3>
                    </div>
                    {book.publishedYear ? (
                      <span className="chip">{book.publishedYear}</span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {book.author.name}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {book.description || "Sin descripción registrada."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    {book.isbn ? <span className="chip">ISBN {book.isbn}</span> : null}
                    {book.pages ? <span className="chip">{book.pages} páginas</span> : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        startTransition(() => {
                          setEditingBookId(book.id);
                          setForm(getBookForm(book));
                          setError(null);
                          setFeedback(null);
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button-danger"
                      disabled={deletingId === book.id}
                      onClick={() => void handleDelete(book.id)}
                    >
                      {deletingId === book.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-600">
              Página {pagination.page} de {pagination.totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="button-secondary"
                disabled={!pagination.hasPrev || isPaging}
                onClick={() =>
                  startTransition(() => {
                    setLoading(true);
                    setPage((current) => Math.max(1, current - 1));
                  })
                }
              >
                Anterior
              </button>

              <button
                type="button"
                className="button-primary"
                disabled={!pagination.hasNext || isPaging}
                onClick={() =>
                  startTransition(() => {
                    setLoading(true);
                    setPage((current) => current + 1);
                  })
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
