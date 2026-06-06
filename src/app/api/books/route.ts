import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  normalizeOptionalInteger,
  normalizeOptionalText,
  normalizeText,
  type BookBody,
} from "@/lib/book-input";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isKnownPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

// GET - Obtener todos los libros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre")?.trim();
    const authorId = searchParams.get("authorId")?.trim();

    const books = await prisma.book.findMany({
      where: {
        ...(genre ? { genre } : {}),
        ...(authorId ? { authorId } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener libros" },
      { status: 500 },
    );
  }
}

// POST - Crear un nuevo libro
export async function POST(request: Request) {
  let body: BookBody;

  try {
    body = (await request.json()) as BookBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const title = normalizeText(body.title);
  const description = normalizeOptionalText(body.description);
  const isbn = normalizeOptionalText(body.isbn);
  const publishedYear = normalizeOptionalInteger(body.publishedYear);
  const genre = normalizeText(body.genre);
  const pages = normalizeOptionalInteger(body.pages);
  const authorId = normalizeText(body.authorId);

  if (!title || !authorId || !genre) {
    return NextResponse.json(
      { error: "Título, género y autor son requeridos" },
      { status: 400 },
    );
  }

  if (title.length < 3) {
    return NextResponse.json(
      { error: "El título debe tener al menos 3 caracteres" },
      { status: 400 },
    );
  }

  if (typeof publishedYear === "number" && Number.isNaN(publishedYear)) {
    return NextResponse.json(
      { error: "publishedYear debe ser un número válido" },
      { status: 400 },
    );
  }

  if (typeof pages === "number" && Number.isNaN(pages)) {
    return NextResponse.json(
      { error: "pages debe ser un número válido" },
      { status: 400 },
    );
  }

  if (typeof pages === "number" && pages < 1) {
    return NextResponse.json(
      { error: "El número de páginas debe ser mayor a 0" },
      { status: 400 },
    );
  }

  try {
    const authorExists = await prisma.author.findUnique({
      where: { id: authorId },
      select: { id: true },
    });

    if (!authorExists) {
      return NextResponse.json(
        { error: "El autor especificado no existe" },
        { status: 404 },
      );
    }

    const book = await prisma.book.create({
      data: {
        title,
        description,
        isbn,
        publishedYear: publishedYear ?? null,
        genre,
        pages: pages ?? null,
        authorId,
      },
      include: {
        author: true,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (isKnownPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "El ISBN ya existe" },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Error al crear libro" },
      { status: 500 },
    );
  }
}
