import { prisma } from "@/lib/prisma";
import { AppTabs } from "@/components/AppTabs";

export const dynamic = "force-dynamic";

async function getStats() {
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

  const revenue = orders.reduce((s, o) => s + o.paidAmount, 0);
  const invoiced = orders.reduce(
    (s, o) => s + o.items.reduce((ss, i) => ss + i.unitPrice * i.quantity, 0),
    0
  );
  const balance = invoiced - revenue;
  const overheadTotal = overheads.reduce((s, c) => s + c.amount, 0);

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

  return {
    revenue,
    invoiced,
    balance,
    ingredientCost,
    overheadTotal,
    profit: revenue - ingredientCost - overheadTotal,
    pendingCount: orders.filter((o) => o.status === "pending").length,
    preparingCount: orders.filter((o) => o.status === "preparing").length,
    deliveredCount: orders.filter((o) => o.status === "delivered").length,
    totalOrders: orders.length,
  };
}

export default async function HomePage() {
  const [ingredients, recipes, clients, orders, overheads, stats] = await Promise.all([
    prisma.ingredient.findMany({
      include: { purchases: { orderBy: { purchasedAt: "desc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.recipe.findMany({
      include: {
        ingredients: {
          include: { ingredient: { include: { purchases: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.order.findMany({
      include: {
        client: true,
        items: { include: { recipe: true } },
      },
      orderBy: { orderedAt: "desc" },
    }),
    prisma.overheadCost.findMany({ orderBy: { createdAt: "desc" } }),
    getStats(),
  ]);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground font-bold text-lg">
            F
          </div>
          <div>
            <h1 className="font-bold text-xl">Fabricosi</h1>
            <p className="text-xs text-muted-foreground">Gestion cuisine maison</p>
          </div>
        </div>
      </header>

      <AppTabs
        initialIngredients={ingredients}
        initialRecipes={recipes}
        initialClients={clients}
        initialOrders={orders}
        initialOverheads={overheads}
        initialStats={stats}
      />
    </main>
  );
}
