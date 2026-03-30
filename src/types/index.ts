import type {
  Ingredient,
  IngredientPurchase,
  Recipe,
  RecipeIngredient,
  OverheadCost,
  Client,
  Order,
  OrderItem,
} from "@prisma/client";

// ─── Ingrédients ──────────────────────────────────────────────────────────────

export type IngredientWithPurchases = Ingredient & {
  purchases: IngredientPurchase[];
};

// Coût moyen pondéré par unité
export function computeCostPerUnit(ingredient: IngredientWithPurchases): number {
  const totalQty = ingredient.purchases.reduce((s, p) => s + p.quantity, 0);
  const totalCost = ingredient.purchases.reduce((s, p) => s + p.cost, 0);
  if (totalQty === 0) return 0;
  return totalCost / totalQty;
}

// ─── Recettes ─────────────────────────────────────────────────────────────────

export type RecipeIngredientWithIngredient = RecipeIngredient & {
  ingredient: IngredientWithPurchases;
};

export type RecipeWithIngredients = Recipe & {
  ingredients: RecipeIngredientWithIngredient[];
};

// Coût total de la recette (tous ingrédients)
export function computeRecipeCost(recipe: RecipeWithIngredients): number {
  return recipe.ingredients.reduce((sum, ri) => {
    const cpu = computeCostPerUnit(ri.ingredient);
    return sum + ri.quantity * cpu;
  }, 0);
}

// Coût par portion
export function computeCostPerServing(recipe: RecipeWithIngredients): number {
  if (recipe.servings === 0) return 0;
  return computeRecipeCost(recipe) / recipe.servings;
}

// Marge par portion
export function computeMarginPerServing(recipe: RecipeWithIngredients): number {
  return recipe.salePrice - computeCostPerServing(recipe);
}

// ─── Commandes ────────────────────────────────────────────────────────────────

export type OrderItemWithRecipe = OrderItem & {
  recipe: Recipe;
};

export type OrderWithRelations = Order & {
  client: Client;
  items: OrderItemWithRecipe[];
};

export function computeOrderTotal(order: OrderWithRelations): number {
  return order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
}

export function computeOrderBalance(order: OrderWithRelations): number {
  return computeOrderTotal(order) - order.paidAmount;
}

// ─── Statuts ──────────────────────────────────────────────────────────────────

export const ORDER_STATUS = {
  pending: "En attente",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
} as const;

export const PAYMENT_STATUS = {
  unpaid: "Non payé",
  partial: "Acompte",
  paid: "Payé",
} as const;

export const UNITS = ["g", "kg", "ml", "l", "unite"] as const;
export type Unit = (typeof UNITS)[number];

export const OVERHEAD_FREQUENCIES = {
  once: "Ponctuel",
  monthly: "Mensuel",
} as const;

// ─── Re-exports Prisma ────────────────────────────────────────────────────────

export type {
  Ingredient,
  IngredientPurchase,
  Recipe,
  RecipeIngredient,
  OverheadCost,
  Client,
  Order,
  OrderItem,
};
