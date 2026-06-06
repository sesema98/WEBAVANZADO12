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

// GET - Obtener todos los libros de un autor específico
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
      },
    });

    if (!author) {
      return NextResponse.json(
        { error: "Autor no encontrado" },
        { status: 404 },
      );
    }

    const books = await prisma.book.findMany({
      where: { authorId: id },
      orderBy: {
        publishedYear: "desc",
      },
    });

    return NextResponse.json({
      author,
      totalBooks: books.length,
      books,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener libros del autor" },
      { status: 500 },
    );
  }
}
