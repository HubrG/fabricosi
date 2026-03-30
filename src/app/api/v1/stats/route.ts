import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [orders, overheads] = await Promise.all([
    prisma.order.findMany({
      include: {
        items: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: { ingredient: { include: { purchases: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.overheadCost.findMany(),
  ]);

  // CA total (commandes payées ou partiellement payées)
  const revenue = orders.reduce((s, o) => s + o.paidAmount, 0);

  // CA facturé (total des commandes)
  const invoiced = orders.reduce((s, o) =>
    s + o.items.reduce((ss, i) => ss + i.unitPrice * i.quantity, 0), 0
  );

  // Balance due
  const balance = invoiced - revenue;

  // Frais annexes mensuels × 1 + ponctuels
  const overheadTotal = overheads.reduce((s, c) => s + c.amount, 0);

  // Coût ingrédients utilisés dans toutes les commandes (livrées)
  let ingredientCost = 0;
  for (const order of orders.filter((o) => o.status === "delivered")) {
    for (const item of order.items) {
      for (const ri of item.recipe.ingredients) {
        const totalQty = ri.ingredient.purchases.reduce((s, p) => s + p.quantity, 0);
        const totalCost = ri.ingredient.purchases.reduce((s, p) => s + p.cost, 0);
        const cpu = totalQty > 0 ? totalCost / totalQty : 0;
        ingredientCost += (ri.quantity / item.recipe.servings) * item.quantity * cpu;
      }
    }
  }

  const profit = revenue - ingredientCost - overheadTotal;

  // Commandes par statut
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return NextResponse.json({
    revenue,
    invoiced,
    balance,
    ingredientCost,
    overheadTotal,
    profit,
    pendingCount,
    preparingCount,
    deliveredCount,
    totalOrders: orders.length,
  });
}
