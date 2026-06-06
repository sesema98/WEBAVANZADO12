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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isKnownPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

async function getBookId(params: RouteContext["params"]) {
  const { id } = await params;
  return id.trim();
}

// GET - Obtener un libro específico por ID
export async function GET(_request: Request, { params }: RouteContext) {
  const id = await getBookId(params);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        author: true,
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener libro" },
      { status: 500 },
    );
  }
}

// PUT - Actualizar un libro
export async function PUT(request: Request, { params }: RouteContext) {
  const id = await getBookId(params);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: BookBody;

  try {
    body = (await request.json()) as BookBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const data: Prisma.BookUpdateInput = {};

  if ("title" in body) {
    const title = normalizeText(body.title);

    if (!title || title.length < 3) {
      return NextResponse.json(
        { error: "El título debe tener al menos 3 caracteres" },
        { status: 400 },
      );
    }

    data.title = title;
  }

  if ("description" in body) {
    const description = normalizeOptionalText(body.description);

    if (
      body.description !== null &&
      body.description !== undefined &&
      description === undefined
    ) {
      return NextResponse.json(
        { error: "Descripción inválida" },
        { status: 400 },
      );
    }

    data.description = description;
  }

  if ("isbn" in body) {
    const isbn = normalizeOptionalText(body.isbn);

    if (body.isbn !== null && body.isbn !== undefined && isbn === undefined) {
      return NextResponse.json({ error: "ISBN inválido" }, { status: 400 });
    }

    data.isbn = isbn;
  }

  if ("publishedYear" in body) {
    const publishedYear = normalizeOptionalInteger(body.publishedYear);

    if (typeof publishedYear === "number" && Number.isNaN(publishedYear)) {
      return NextResponse.json(
        { error: "publishedYear debe ser un número válido" },
        { status: 400 },
      );
    }

    data.publishedYear = publishedYear;
  }

  if ("genre" in body) {
    const genre = normalizeText(body.genre);

    if (!genre) {
      return NextResponse.json({ error: "Género inválido" }, { status: 400 });
    }

    data.genre = genre;
  }

  if ("pages" in body) {
    const pages = normalizeOptionalInteger(body.pages);

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

    data.pages = pages;
  }

  if ("authorId" in body) {
    const authorId = normalizeText(body.authorId);

    if (!authorId) {
      return NextResponse.json(
        { error: "Autor inválido" },
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
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Error al validar autor" },
        { status: 500 },
      );
    }

    data.author = {
      connect: { id: authorId },
    };
  }

  try {
    const book = await prisma.book.update({
      where: { id },
      data,
      include: {
        author: true,
      },
    });

    return NextResponse.json(book);
  } catch (error) {
    if (isKnownPrismaError(error, "P2025")) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 },
      );
    }

    if (isKnownPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "El ISBN ya existe" },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Error al actualizar libro" },
      { status: 500 },
    );
  }
}

// DELETE - Eliminar un libro
export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = await getBookId(params);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.book.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Libro eliminado correctamente",
    });
  } catch (error) {
    if (isKnownPrismaError(error, "P2025")) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Error al eliminar libro" },
      { status: 500 },
    );
  }
}
