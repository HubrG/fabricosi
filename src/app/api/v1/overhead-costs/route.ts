import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  frequency: z.enum(["once", "monthly"]),
});

export async function GET() {
  const costs = await prisma.overheadCost.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(costs);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const cost = await prisma.overheadCost.create({ data: parsed.data });
  return NextResponse.json(cost, { status: 201 });
}
