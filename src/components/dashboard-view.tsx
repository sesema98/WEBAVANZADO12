"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { requestJson } from "@/lib/http";
import type { AuthorWithBooks } from "@/lib/ui-types";

type AuthorFormState = {
  name: string;
  email: string;
  bio: string;
  nationality: string;
  birthYear: string;
};

const emptyAuthorForm: AuthorFormState = {
  name: "",
  email: "",
  bio: "",
  nationality: "",
  birthYear: "",
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

export function DashboardView() {
  const [authors, setAuthors] = useState<AuthorWithBooks[]>([]);
  const [form, setForm] = useState<AuthorFormState>(emptyAuthorForm);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const data = await requestJson<AuthorWithBooks[]>("/api/authors");

        if (cancelled) {
          return;
        }

        setAuthors(data);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los autores.",
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
  }, []);

  const totalAuthors = authors.length;
  const totalBooks = authors.reduce(
    (total, author) => total + (author._count?.books ?? author.books.length),
    0,
  );
  const averageBooks = totalAuthors
    ? (totalBooks / totalAuthors).toFixed(1)
    : "0.0";
  const uniqueGenres = [
    ...new Set(authors.flatMap((author) => author.books.map((book) => book.genre))),
  ];
  const prolificAuthor = authors
    .slice()
    .sort(
      (first, second) =>
        (second._count?.books ?? second.books.length) -
        (first._count?.books ?? first.books.length),
    )[0];

  async function refreshAuthors(message?: string) {
    setLoading(true);

    try {
      const data = await requestJson<AuthorWithBooks[]>("/api/authors");
      setAuthors(data);
      setFeedback(message ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los autores.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      await requestJson(editingAuthorId ? `/api/authors/${editingAuthorId}` : "/api/authors", {
        method: editingAuthorId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });

      startTransition(() => {
        setEditingAuthorId(null);
        setForm(emptyAuthorForm);
      });

      await refreshAuthors(
        editingAuthorId
          ? "Autor actualizado correctamente."
          : "Autor creado correctamente.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el autor.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(authorId: string) {
    if (!window.confirm("¿Seguro que quieres eliminar este autor?")) {
      return;
    }

    setDeletingId(authorId);
    setError(null);
    setFeedback(null);

    try {
      await requestJson(`/api/authors/${authorId}`, {
        method: "DELETE",
      });

      if (editingAuthorId === authorId) {
        startTransition(() => {
          setEditingAuthorId(null);
          setForm(emptyAuthorForm);
        });
      }

      await refreshAuthors("Autor eliminado correctamente.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo eliminar el autor.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page-shell space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-white/10 bg-[#101827] p-8 text-white shadow-[0_28px_90px_-36px_rgba(15,23,42,0.9)]">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#fbbf24]">
            Dashboard editorial
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Gestiona autores, conecta libros y controla la biblioteca desde un
            solo panel.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Crea autores, edita su información y salta a su ficha individual
            para revisar estadísticas o publicar nuevos libros.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/books" className="button-primary">
              Ir al catálogo de libros
            </Link>
            <button
              type="button"
              className="button-secondary border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => {
                startTransition(() => {
                  setEditingAuthorId(null);
                  setForm(emptyAuthorForm);
                  setFeedback(null);
                });
              }}
            >
              Nuevo autor
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Autores
            </p>
            <p className="mt-3 text-4xl font-semibold">{totalAuthors}</p>
            <p className="mt-2 text-sm text-white/65">
              Registros activos en la biblioteca.
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Libros
            </p>
            <p className="mt-3 text-4xl font-semibold">{totalBooks}</p>
            <p className="mt-2 text-sm text-white/65">
              Obras asociadas a los autores cargados.
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Promedio
            </p>
            <p className="mt-3 text-4xl font-semibold">{averageBooks}</p>
            <p className="mt-2 text-sm text-white/65">
              Libros por autor en el sistema.
            </p>
          </article>

          <article className="stat-card">
            <p className="text-sm uppercase tracking-[0.28em] text-white/55">
              Géneros
            </p>
            <p className="mt-3 text-4xl font-semibold">{uniqueGenres.length}</p>
            <p className="mt-2 text-sm text-white/65">
              {prolificAuthor
                ? `Autor más prolífico: ${prolificAuthor.name}`
                : "Agrega datos para ver tendencias."}
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">
                Editor
              </p>
              <h2 className="mt-2 section-title">
                {editingAuthorId ? "Editar autor" : "Crear autor"}
              </h2>
              <p className="mt-2 section-copy">
                Completa los datos básicos del autor y guarda el registro.
              </p>
            </div>
            {editingAuthorId ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  startTransition(() => {
                    setEditingAuthorId(null);
                    setForm(emptyAuthorForm);
                  });
                }}
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="author-name">
                Nombre
              </label>
              <input
                id="author-name"
                className="field"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Gabriel García Márquez"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="author-email">
                Email
              </label>
              <input
                id="author-email"
                className="field"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="autor@correo.com"
                required
                type="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="author-nationality">
                Nacionalidad
              </label>
              <input
                id="author-nationality"
                className="field"
                value={form.nationality}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nationality: event.target.value,
                  }))
                }
                placeholder="Colombia"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="author-birth-year">
                Año de nacimiento
              </label>
              <input
                id="author-birth-year"
                className="field"
                value={form.birthYear}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    birthYear: event.target.value,
                  }))
                }
                placeholder="1927"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="author-bio">
                Biografía
              </label>
              <textarea
                id="author-bio"
                className="textarea"
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                placeholder="Resumen corto del autor y su obra."
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

            <button className="button-primary w-full" disabled={submitting} type="submit">
              {submitting
                ? "Guardando..."
                : editingAuthorId
                  ? "Actualizar autor"
                  : "Crear autor"}
            </button>
          </form>
        </aside>

        <section className="panel p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">
                Base de autores
              </p>
              <h2 className="mt-2 section-title">Autores registrados</h2>
              <p className="mt-2 section-copy">
                Edita datos, elimina registros o entra al detalle del autor.
              </p>
            </div>
            <span className="chip">{totalAuthors} autores</span>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse rounded-[26px] border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          ) : authors.length === 0 ? (
            <div className="panel-muted mt-6 p-6 text-sm text-slate-600">
              No hay autores todavía. Usa el formulario para crear el primero.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {authors.map((author) => (
                <article
                  key={author.id}
                  className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">
                        {author.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">{author.email}</p>
                    </div>
                    <span className="chip">
                      {author._count?.books ?? author.books.length} libros
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-800">Nacionalidad:</span>{" "}
                      {author.nationality || "Sin registrar"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Nacimiento:</span>{" "}
                      {author.birthYear || "Sin registrar"}
                    </p>
                    <p className="line-clamp-3">
                      <span className="font-medium text-slate-800">Bio:</span>{" "}
                      {author.bio || "Sin biografía."}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        startTransition(() => {
                          setEditingAuthorId(author.id);
                          setForm(getAuthorForm(author));
                          setFeedback(null);
                          setError(null);
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button-danger"
                      disabled={deletingId === author.id}
                      onClick={() => void handleDelete(author.id)}
                    >
                      {deletingId === author.id ? "Eliminando..." : "Eliminar"}
                    </button>
                    <Link href={`/authors/${author.id}`} className="button-primary">
                      Ver libros y detalle
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
