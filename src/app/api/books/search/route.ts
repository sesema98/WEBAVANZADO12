import { Prisma, type PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SORT_FIELDS = ["title", "publishedYear", "createdAt"] as const;
const ORDER_VALUES = ["asc", "desc"] as const;

type SortField = (typeof SORT_FIELDS)[number];
type SortOrder = (typeof ORDER_VALUES)[number];

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
}

function getSortField(value: string | null): SortField {
  if (value && SORT_FIELDS.includes(value as SortField)) {
    return value as SortField;
  }

  return "createdAt";
}

function getSortOrder(value: string | null): SortOrder {
  if (value && ORDER_VALUES.includes(value as SortOrder)) {
    return value as SortOrder;
  }

  return "desc";
}

function getOrderBy(sortBy: SortField, order: SortOrder) {
  return { [sortBy]: order } as Prisma.BookOrderByWithRelationInput;
}

function buildWhere(searchParams: URLSearchParams): Prisma.BookWhereInput {
  const search = searchParams.get("search")?.trim();
  const genre = searchParams.get("genre")?.trim();
  const authorName = searchParams.get("authorName")?.trim();

  const andConditions: Prisma.BookWhereInput[] = [];

  if (search) {
    andConditions.push({
      title: {
        contains: search,
        mode: "insensitive",
      },
    });
  }

  if (genre) {
    andConditions.push({ genre });
  }

  if (authorName) {
    andConditions.push({
      author: {
        name: {
          contains: authorName,
          mode: "insensitive",
        },
      },
    });
  }

  if (!andConditions.length) {
    return {};
  }

  return { AND: andConditions };
}

async function getBooksData(
  client: PrismaClient,
  where: Prisma.BookWhereInput,
  skip: number,
  take: number,
  orderBy: Prisma.BookOrderByWithRelationInput,
) {
  return Promise.all([
    client.book.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    client.book.count({ where }),
  ]);
}

// GET - Buscar libros con paginación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 10), 50);
    const sortBy = getSortField(searchParams.get("sortBy"));
    const order = getSortOrder(searchParams.get("order"));
    const where = buildWhere(searchParams);
    const skip = (page - 1) * limit;

    const [data, total] = await getBooksData(
      prisma,
      where,
      skip,
      limit,
      getOrderBy(sortBy, order),
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al buscar libros" },
      { status: 500 },
    );
  }
}
