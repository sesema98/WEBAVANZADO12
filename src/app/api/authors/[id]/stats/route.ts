import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getAuthorId(params: RouteContext["params"]) {
  const { id } = await params;
  return id.trim();
}

// GET - Obtener estadísticas completas de un autor
export async function GET(_request: Request, { params }: RouteContext) {
  const id = await getAuthorId(params);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const author = await prisma.author.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        books: {
          select: {
            id: true,
            title: true,
            genre: true,
            pages: true,
            publishedYear: true,
          },
        },
      },
    });

    if (!author) {
      return NextResponse.json(
        { error: "Autor no encontrado" },
        { status: 404 },
      );
    }

    const booksWithYear = author.books
      .filter((book) => book.publishedYear !== null)
      .sort((a, b) => {
        if (a.publishedYear === b.publishedYear) {
          return a.title.localeCompare(b.title);
        }

        return (a.publishedYear ?? 0) - (b.publishedYear ?? 0);
      });

    const booksWithPages = author.books
      .filter((book) => book.pages !== null)
      .sort((a, b) => {
        if (a.pages === b.pages) {
          return a.title.localeCompare(b.title);
        }

        return (a.pages ?? 0) - (b.pages ?? 0);
      });

    const genres = [...new Set(author.books.map((book) => book.genre))].sort(
      (a, b) => a.localeCompare(b),
    );

    const averagePages =
      booksWithPages.length > 0
        ? Math.round(
            booksWithPages.reduce((total, book) => total + (book.pages ?? 0), 0) /
              booksWithPages.length,
          )
        : 0;

    const firstBook = booksWithYear[0]
      ? {
          title: booksWithYear[0].title,
          year: booksWithYear[0].publishedYear,
        }
      : null;

    const latestBook = booksWithYear.at(-1)
      ? {
          title: booksWithYear.at(-1)?.title ?? "",
          year: booksWithYear.at(-1)?.publishedYear ?? null,
        }
      : null;

    const shortestBook = booksWithPages[0]
      ? {
          title: booksWithPages[0].title,
          pages: booksWithPages[0].pages,
        }
      : null;

    const longestBook = booksWithPages.at(-1)
      ? {
          title: booksWithPages.at(-1)?.title ?? "",
          pages: booksWithPages.at(-1)?.pages ?? null,
        }
      : null;

    return NextResponse.json({
      authorId: author.id,
      authorName: author.name,
      totalBooks: author.books.length,
      firstBook,
      latestBook,
      averagePages,
      genres,
      longestBook,
      shortestBook,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas del autor" },
      { status: 500 },
    );
  }
}
