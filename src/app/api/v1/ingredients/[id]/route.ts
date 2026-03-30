import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
});

const purchaseSchema = z.object({
  action: z.literal("purchase"),
  quantity: z.number().positive(),
  cost: z.number().nonnegative(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  // Ajout d'un achat
  if (body.action === "purchase") {
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const { quantity, cost } = parsed.data;
    const [, ingredient] = await prisma.$transaction([
      prisma.ingredientPurchase.create({ data: { ingredientId: id, quantity, cost } }),
      prisma.ingredient.update({
        where: { id },
        data: { stockQuantity: { increment: quantity } },
        include: { purchases: { orderBy: { purchasedAt: "desc" } } },
      }),
    ]);
    return NextResponse.json(ingredient);
  }

  // Mise à jour nom/unité
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: parsed.data,
    include: { purchases: { orderBy: { purchasedAt: "desc" } } },
  });
  return NextResponse.json(ingredient);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.ingredient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
