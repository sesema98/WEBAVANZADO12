"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { requestJson } from "@/lib/http";
import type { AuthorStats, AuthorWithBooks } from "@/lib/ui-types";

type AuthorFormState = {
  name: string;
  email: string;
  bio: string;
  nationality: string;
  birthYear: string;
};

type BookFormState = {
  title: string;
  description: string;
  isbn: string;
  publishedYear: string;
  genre: string;
  pages: string;
};

const emptyBookForm: BookFormState = {
  title: "",
  description: "",
  isbn: "",
  publishedYear: "",
  genre: "",
  pages: "",
};

function getAuthorForm(author: AuthorWithBooks): AuthorFormState {
  return {
    name: author.name,
    email: author.email,
    bio: author.bio ?? "",
    nationality: author.nationality ?? "",
    birthYear: author.birthYear?.toString() ?? "",
  };
}

export function AuthorDetailView({ authorId }: { authorId: string }) {
  const [author, setAuthor] = useState<AuthorWithBooks | null>(null);
  const [stats, setStats] = useState<AuthorStats | null>(null);
  const [authorForm, setAuthorForm] = useState<AuthorFormState | null>(null);
  const [bookForm, setBookForm] = useState<BookFormState>(emptyBookForm);
  const [loading, setLoading] = useState(true);
  const [authorSaving, setAuthorSaving] = useState(false);
  const [bookSaving, setBookSaving] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [authorData, statsData] = await Promise.all([
          requestJson<AuthorWithBooks>(`/api/authors/${authorId}`),
          requestJson<AuthorStats>(`/api/authors/${authorId}/stats`),
        ]);

        if (cancelled) {
          return;
        }

        setAuthor(authorData);
        setStats(statsData);
        setAuthorForm(getAuthorForm(authorData));
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el autor.",
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
  }, [authorId]);

  async function refreshAuthor(message?: string) {
    setLoading(true);

    try {
      const [authorData, statsData] = await Promise.all([
        requestJson<AuthorWithBooks>(`/api/authors/${authorId}`),
        requestJson<AuthorStats>(`/api/authors/${authorId}/stats`),
      ]);

      setAuthor(authorData);
      setStats(statsData);
      setAuthorForm(getAuthorForm(authorData));
      setFeedback(message ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el autor.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthorUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authorForm) {
      return;
    }

    setAuthorSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await requestJson(`/api/authors/${authorId}`, {
        method: "PUT",
        body: JSON.stringify(authorForm),
      });

      await refreshAuthor("Autor actualizado correctamente.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el autor.",
      );
    } finally {
      setAuthorSaving(false);
    }
  }

  async function handleBookCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await requestJson("/api/books", {
        method: "POST",
        body: JSON.stringify({
          ...bookForm,
          authorId,
        }),
      });

      startTransition(() => {
        setBookForm(emptyBookForm);
        setShowBookForm(false);
      });

      await refreshAuthor("Libro agregado correctamente.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el libro.",
      );
    } finally {
      setBookSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="h-[420px] animate-pulse rounded-[32px] border border-slate-200 bg-white/70" />
          <div className="h-[420px] animate-pulse rounded-[32px] border border-slate-200 bg-white/70" />
        </div>
      </main>
    );
  }

  if (!author || !authorForm || !stats) {
    return (
      <main className="page-shell">
        <div className="panel p-8">
          <h1 className="section-title">Autor no disponible</h1>
          <p className="mt-3 section-copy">
            {error || "No se encontró el autor solicitado."}
          </p>
          <Link href="/" className="button-primary mt-6">
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell space-y-8">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[32px] border border-white/10 bg-[#101827] p-8 text-white shadow-[0_28px_90px_-36px_rgba(15,23,42,0.9)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#fbbf24]">
                Perfil del autor
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                {author.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                {author.bio || "Sin biografía registrada todavía."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/" className="button-secondary border-white/15 bg-white/5 text-white hover:bg-white/10">
                Volver
              </Link>
              <Link href="/books" className="button-secondary border-white/15 bg-white/5 text-white hover:bg-white/10">
                Catálogo
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                Email
              </p>
              <p className="mt-3 text-base font-medium text-white">{author.email}</p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                Nacionalidad
              </p>
              <p className="mt-3 text-base font-medium text-white">
                {author.nationality || "Sin dato"}
              </p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                Nacimiento
              </p>
              <p className="mt-3 text-base font-medium text-white">
                {author.birthYear || "Sin dato"}
              </p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                Libros
              </p>
              <p className="mt-3 text-base font-medium text-white">
                {stats.totalBooks}
              </p>
            </article>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Primer libro
            </p>
            <p className="mt-3 text-xl font-semibold">
              {stats.firstBook?.title || "Sin dato"}
            </p>
            <p className="mt-2 text-sm text-white/65">
              {stats.firstBook?.year || "Año no disponible"}
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Último libro
            </p>
            <p className="mt-3 text-xl font-semibold">
              {stats.latestBook?.title || "Sin dato"}
            </p>
            <p className="mt-2 text-sm text-white/65">
              {stats.latestBook?.year || "Año no disponible"}
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Promedio páginas
            </p>
            <p className="mt-3 text-4xl font-semibold">{stats.averagePages}</p>
            <p className="mt-2 text-sm text-white/65">
              Basado en los libros con páginas registradas.
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="panel p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">
              Editar perfil
            </p>
            <h2 className="mt-2 section-title">Actualizar autor</h2>
            <p className="mt-2 section-copy">
              Modifica sus datos y guarda los cambios sin salir de esta vista.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleAuthorUpdate}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="detail-name">
                Nombre
              </label>
              <input
                id="detail-name"
                className="field"
                value={authorForm.name}
                onChange={(event) =>
                  setAuthorForm((current) =>
                    current
                      ? { ...current, name: event.target.value }
                      : current,
                  )
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="detail-email">
                Email
              </label>
              <input
                id="detail-email"
                className="field"
                type="email"
                value={authorForm.email}
                onChange={(event) =>
                  setAuthorForm((current) =>
                    current
                      ? { ...current, email: event.target.value }
                      : current,
                  )
                }
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="detail-nationality"
                >
                  Nacionalidad
                </label>
                <input
                  id="detail-nationality"
                  className="field"
                  value={authorForm.nationality}
                  onChange={(event) =>
                    setAuthorForm((current) =>
                      current
                        ? { ...current, nationality: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="detail-birth-year"
                >
                  Año de nacimiento
                </label>
                <input
                  id="detail-birth-year"
                  className="field"
                  inputMode="numeric"
                  value={authorForm.birthYear}
                  onChange={(event) =>
                    setAuthorForm((current) =>
                      current
                        ? { ...current, birthYear: event.target.value }
                        : current,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="detail-bio">
                Biografía
              </label>
              <textarea
                id="detail-bio"
                className="textarea"
                value={authorForm.bio}
                onChange={(event) =>
                  setAuthorForm((current) =>
                    current
                      ? { ...current, bio: event.target.value }
                      : current,
                  )
                }
              />
            </div>

            <button className="button-primary w-full" disabled={authorSaving} type="submit">
              {authorSaving ? "Actualizando..." : "Guardar cambios"}
            </button>
          </form>
        </aside>

        <section className="space-y-6">
          <div className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">
                  Estadísticas
                </p>
                <h2 className="mt-2 section-title">Indicadores del autor</h2>
              </div>

              <button
                type="button"
                className="button-primary"
                onClick={() => setShowBookForm((current) => !current)}
              >
                {showBookForm ? "Cerrar formulario" : "Agregar nuevo libro"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article className="panel-muted p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Géneros
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stats.genres.length ? (
                    stats.genres.map((genre) => <span key={genre} className="chip">{genre}</span>)
                  ) : (
                    <span className="text-sm text-slate-500">Sin géneros aún.</span>
                  )}
                </div>
              </article>

              <article className="panel-muted p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Libro más extenso
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {stats.longestBook?.title || "Sin dato"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {stats.longestBook?.pages
                    ? `${stats.longestBook.pages} páginas`
                    : "Sin páginas registradas"}
                </p>
              </article>

              <article className="panel-muted p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Libro más corto
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {stats.shortestBook?.title || "Sin dato"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {stats.shortestBook?.pages
                    ? `${stats.shortestBook.pages} páginas`
                    : "Sin páginas registradas"}
                </p>
              </article>
            </div>

            {showBookForm ? (
              <form className="mt-6 grid gap-4 rounded-[26px] border border-slate-200 bg-slate-50 p-5" onSubmit={handleBookCreate}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="author-book-title">
                      Título
                    </label>
                    <input
                      id="author-book-title"
                      className="field"
                      value={bookForm.title}
                      onChange={(event) =>
                        setBookForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="author-book-genre">
                      Género
                    </label>
                    <input
                      id="author-book-genre"
                      className="field"
                      value={bookForm.genre}
                      onChange={(event) =>
                        setBookForm((current) => ({
                          ...current,
                          genre: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="author-book-isbn">
                      ISBN
                    </label>
                    <input
                      id="author-book-isbn"
                      className="field"
                      value={bookForm.isbn}
                      onChange={(event) =>
                        setBookForm((current) => ({
                          ...current,
                          isbn: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="author-book-year">
                      Año
                    </label>
                    <input
                      id="author-book-year"
                      className="field"
                      inputMode="numeric"
                      value={bookForm.publishedYear}
                      onChange={(event) =>
                        setBookForm((current) => ({
                          ...current,
                          publishedYear: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="author-book-pages">
                      Páginas
                    </label>
                    <input
                      id="author-book-pages"
                      className="field"
                      inputMode="numeric"
                      value={bookForm.pages}
                      onChange={(event) =>
                        setBookForm((current) => ({
                          ...current,
                          pages: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="author-book-description">
                    Descripción
                  </label>
                  <textarea
                    id="author-book-description"
                    className="textarea"
                    value={bookForm.description}
                    onChange={(event) =>
                      setBookForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>

                <button className="button-primary" disabled={bookSaving} type="submit">
                  {bookSaving ? "Creando..." : "Agregar libro al autor"}
                </button>
              </form>
            ) : null}
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

          <div className="panel p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">
                  Bibliografía
                </p>
                <h2 className="mt-2 section-title">Todos sus libros</h2>
              </div>
              <span className="chip">{author.books.length} libros asociados</span>
            </div>

            {author.books.length === 0 ? (
              <div className="panel-muted mt-6 p-6 text-sm text-slate-600">
                Este autor todavía no tiene libros registrados.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {author.books.map((book) => (
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

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {book.description || "Sin descripción registrada."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {book.pages ? <span className="chip">{book.pages} páginas</span> : null}
                      {book.isbn ? <span className="chip">ISBN {book.isbn}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
