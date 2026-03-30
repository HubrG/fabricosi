import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "preparing", "ready", "delivered"]).optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  paidAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  deliveredAt: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { deliveredAt, status, ...rest } = parsed.data;

  // Quand on passe en "preparing", déduire les ingrédients du stock
  if (status === "preparing") {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            recipe: { include: { ingredients: true } },
          },
        },
      },
    });

    if (order && order.status !== "preparing" && order.status !== "ready" && order.status !== "delivered") {
      // Calcule les déductions par ingrédient
      const deductions = new Map<string, number>();
      for (const item of order.items) {
        for (const ri of item.recipe.ingredients) {
          const qty = (ri.quantity / item.recipe.servings) * item.quantity;
          deductions.set(ri.ingredientId, (deductions.get(ri.ingredientId) ?? 0) + qty);
        }
      }

      await prisma.$transaction([
        ...Array.from(deductions.entries()).map(([ingredientId, qty]) =>
          prisma.ingredient.update({
            where: { id: ingredientId },
            data: { stockQuantity: { decrement: qty } },
          })
        ),
      ]);
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...rest,
      status,
      ...(deliveredAt !== undefined && {
        deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      }),
    },
    include: {
      client: true,
      items: { include: { recipe: true } },
    },
  });

  return NextResponse.json(order);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
