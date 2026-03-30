import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ingredientLineSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  servings: z.number().int().positive(),
  salePrice: z.number().nonnegative(),
  ingredients: z.array(ingredientLineSchema),
});

export async function GET() {
  const recipes = await prisma.recipe.findMany({
    include: {
      ingredients: {
        include: {
          ingredient: { include: { purchases: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { name, description, servings, salePrice, ingredients } = parsed.data;

  const recipe = await prisma.recipe.create({
    data: {
      name,
      description,
      servings,
      salePrice,
      ingredients: {
        create: ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
        })),
      },
    },
    include: {
      ingredients: {
        include: { ingredient: { include: { purchases: true } } },
      },
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
