import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  emailRegex,
  normalizeBirthYear,
  normalizeOptionalText,
  normalizeText,
  type AuthorBody,
} from "@/lib/author-input";
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

async function getAuthorId(params: RouteContext["params"]) {
  const { id } = await params;
  return id.trim();
}

// GET - Obtener un autor específico por ID
export async function GET(_request: Request, { params }: RouteContext) {
  const id = await getAuthorId(params);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const author = await prisma.author.findUnique({
      where: { id },
      include: {
        books: {
          orderBy: {
            publishedYear: "desc",
          },
        },
        _count: {
          select: { books: true },
        },
      },
    });

    if (!author) {
      return NextResponse.json(
        { error: "Autor no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(author);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener autor" },
      { status: 500 },
    );
  }
}

// PUT - Actualizar un autor
export async function PUT(request: Request, { params }: RouteContext) {
  const id = await getAuthorId(params);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: AuthorBody;

  try {
    body = (await request.json()) as AuthorBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const data: Prisma.AuthorUpdateInput = {};

  if ("name" in body) {
    const name = normalizeText(body.name);

    if (!name) {
      return NextResponse.json(
        { error: "Nombre inválido" },
        { status: 400 },
      );
    }

    data.name = name;
  }

  if ("email" in body) {
    const email = normalizeText(body.email);

    if (!email) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 },
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 },
      );
    }

    data.email = email;
  }

  if ("bio" in body) {
    const bio = normalizeOptionalText(body.bio);

    if (body.bio !== null && body.bio !== undefined && bio === undefined) {
      return NextResponse.json({ error: "Bio inválida" }, { status: 400 });
    }

    data.bio = bio;
  }

  if ("nationality" in body) {
    const nationality = normalizeOptionalText(body.nationality);

    if (
      body.nationality !== null &&
      body.nationality !== undefined &&
      nationality === undefined
    ) {
      return NextResponse.json(
        { error: "Nacionalidad inválida" },
        { status: 400 },
      );
    }

    data.nationality = nationality;
  }

  if ("birthYear" in body) {
    const birthYear = normalizeBirthYear(body.birthYear);

    if (typeof birthYear === "number" && Number.isNaN(birthYear)) {
      return NextResponse.json(
        { error: "birthYear debe ser un número válido" },
        { status: 400 },
      );
    }

    data.birthYear = birthYear;
  }

  try {
    const author = await prisma.author.update({
      where: { id },
      data,
      include: {
        books: true,
      },
    });

    return NextResponse.json(author);
  } catch (error) {
    if (isKnownPrismaError(error, "P2025")) {
      return NextResponse.json(
        { error: "Autor no encontrado" },
        { status: 404 },
      );
    }

    if (isKnownPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Error al actualizar autor" },
      { status: 500 },
    );
  }
}

// DELETE - Eliminar un autor
export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = await getAuthorId(params);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.author.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Autor eliminado correctamente",
    });
  } catch (error) {
    if (isKnownPrismaError(error, "P2025")) {
      return NextResponse.json(
        { error: "Autor no encontrado" },
        { status: 404 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Error al eliminar autor" },
      { status: 500 },
    );
  }
}
