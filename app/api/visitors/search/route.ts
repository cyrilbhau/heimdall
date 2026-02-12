import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type VisitorResult = {
  fullName: string;
  email: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  // Require at least 3 characters to search
  if (q.length < 3) {
    return NextResponse.json([] as VisitorResult[]);
  }

  try {
    // Find distinct (fullName, email) pairs matching the query,
    // ordered by most recent visit first, limited to 10 results.
    const results = await prisma.$queryRawUnsafe<
      { full_name: string; email: string }[]
    >(
      `SELECT DISTINCT ON (LOWER("fullName"), LOWER("email"))
         "fullName" AS full_name, "email"
       FROM "Visit"
       WHERE "fullName" ILIKE $1
       ORDER BY LOWER("fullName"), LOWER("email"), "createdAt" DESC
       LIMIT 10`,
      `%${q}%`
    );

    const visitors: VisitorResult[] = results.map((row) => ({
      fullName: row.full_name,
      email: row.email,
    }));

    return NextResponse.json(visitors);
  } catch (error) {
    console.error("Visitor search failed", error);
    return NextResponse.json([] as VisitorResult[]);
  }
}
