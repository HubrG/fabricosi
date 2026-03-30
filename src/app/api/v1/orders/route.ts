import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const itemSchema = z.object({
  recipeId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const createSchema = z.object({
  clientId: z.string(),
  notes: z.string().optional(),
  orderedAt: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const orders = await prisma.order.findMany({
    include: {
      client: true,
      items: { include: { recipe: true } },
    },
    orderBy: { orderedAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { clientId, notes, orderedAt, items } = parsed.data;

  const order = await prisma.order.create({
    data: {
      clientId,
      notes,
      orderedAt: orderedAt ? new Date(orderedAt) : undefined,
      items: { create: items },
    },
    include: {
      client: true,
      items: { include: { recipe: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
