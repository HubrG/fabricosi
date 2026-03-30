import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ingredientLineSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  servings: z.number().int().positive().optional(),
  salePrice: z.number().nonnegative().optional(),
  ingredients: z.array(ingredientLineSchema).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { ingredients, ...rest } = parsed.data;

  const recipe = await prisma.$transaction(async (tx) => {
    if (ingredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }
    return tx.recipe.update({
      where: { id },
      data: {
        ...rest,
        ...(ingredients && {
          ingredients: {
            create: ingredients.map((i) => ({
              ingredientId: i.ingredientId,
              quantity: i.quantity,
            })),
          },
        }),
      },
      include: {
        ingredients: {
          include: { ingredient: { include: { purchases: true } } },
        },
      },
    });
  });

  return NextResponse.json(recipe);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
