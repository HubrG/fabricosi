# CLAUDE.md — Fabricosi

## Projet

App de gestion cuisine maison pour la vente de plats préparés (Argentine).
Solo, sans auth. Une seule page avec onglets.

## Stack

- Next.js 16, React 19, TypeScript, App Router, Turbopack
- Tailwind CSS v4 + Lucide icons + Recharts
- TanStack Query v5 + Zod v4 + React Hook Form
- Prisma 7 + PostgreSQL (`fabricosi`)
- radix-ui (Dialog, Tabs) — imports via `import { Dialog } from "radix-ui"` (pas @radix-ui/react-*)
- sonner pour les toasts
- **pnpm obligatoire**

## Architecture Data Flow

```
page.tsx (RSC) → fetch initialData via prisma direct
Client → TanStack Query hooks (staleTime: 30s)
Mutations → API Routes (/api/v1/) → invalidateQueries
```

## Fichiers critiques

- `prisma/schema.prisma` — modèles Ingredient, IngredientPurchase, Recipe, RecipeIngredient, OverheadCost, Client, Order, OrderItem
- `src/lib/prisma.ts` — singleton PrismaPg
- `src/types/index.ts` — types + fonctions de calcul (computeCostPerUnit, computeRecipeCost, etc.)
- `src/app/page.tsx` — RSC, charge toutes les données initiales
- `src/components/AppTabs.tsx` — shell avec les 6 onglets Radix Tabs
- `src/components/tabs/` — 6 onglets métier

## Onglets

| Onglet | Fichier |
|--------|---------|
| Tableau de bord | DashboardTab.tsx |
| Ingrédients | IngredientsTab.tsx |
| Recettes | RecipesTab.tsx |
| Clients | ClientsTab.tsx |
| Commandes | OrdersTab.tsx |
| Comptabilité | AccountingTab.tsx |

## Logique stock

- `Ingredient.stockQuantity` est mis à jour automatiquement :
  - **+qty** lors d'un achat (`PATCH /api/v1/ingredients/[id]` avec `action: "purchase"`)
  - **-qty** quand une commande passe en statut `"preparing"` (déduction proportionnelle aux recettes)
- Coût moyen pondéré = `Σ(purchases.cost) / Σ(purchases.quantity)`

## Calculs métier

- `coût/unité = Σ achats coût / Σ achats quantité`
- `coût recette = Σ (recipeIngredient.quantity × coût/unité)`
- `coût/portion = coût recette / servings`
- `marge/portion = salePrice - coût/portion`
- `total commande = Σ (orderItem.unitPrice × quantity)`

## Variables d'environnement

```env
DATABASE_URL="postgresql://hubertgiorgi@localhost:5432/fabricosi?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Commandes utiles

```bash
pnpm dev           # Dev avec Turbopack
pnpm build         # Build production
pnpm db:migrate    # Migrations Prisma
pnpm db:generate   # Regénérer client Prisma
pnpm db:studio     # Prisma Studio
```

## Prisma 7

URL dans `prisma.config.ts`, pas dans `schema.prisma` (bloc datasource sans url).
