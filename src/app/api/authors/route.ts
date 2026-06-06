import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  emailRegex,
  normalizeBirthYear,
  normalizeText,
  type AuthorBody,
} from "@/lib/author-input";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET - Obtener todos los autores
export async function GET() {
  try {
    const authors = await prisma.author.findMany({
      include: {
        books: true,
        _count: {
          select: { books: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(authors);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener autores" },
      { status: 500 },
    );
  }
}

// POST - Crear un nuevo autor
export async function POST(request: Request) {
  let body: AuthorBody;

  try {
    body = (await request.json()) as AuthorBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = normalizeText(body.name);
  const email = normalizeText(body.email);
  const bio = normalizeText(body.bio);
  const nationality = normalizeText(body.nationality);
  const birthYear = normalizeBirthYear(body.birthYear);

  if (!name || !email) {
    return NextResponse.json(
      { error: "Nombre y email son requeridos" },
      { status: 400 },
    );
  }

  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  if (typeof birthYear === "number" && Number.isNaN(birthYear)) {
    return NextResponse.json(
      { error: "birthYear debe ser un número válido" },
      { status: 400 },
    );
  }

  try {
    const author = await prisma.author.create({
      data: {
        name,
        email,
        bio: bio || null,
        nationality: nationality || null,
        birthYear: birthYear ?? null,
      },
      include: {
        books: true,
      },
    });

    return NextResponse.json(author, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Error al crear autor" },
      { status: 500 },
    );
  }
}
