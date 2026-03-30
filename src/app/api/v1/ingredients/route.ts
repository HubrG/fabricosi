import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  // Premier achat optionnel à la création
  quantity: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
});

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    include: { purchases: { orderBy: { purchasedAt: "desc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(ingredients);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { name, unit, quantity, cost } = parsed.data;

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      stockQuantity: quantity ?? 0,
      purchases:
        quantity && cost
          ? { create: { quantity, cost } }
          : undefined,
    },
    include: { purchases: true },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
