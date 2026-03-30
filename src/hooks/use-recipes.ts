"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RecipeWithIngredients } from "@/types";

export const RECIPES_KEY = ["recipes"] as const;

async function fetchRecipes(): Promise<RecipeWithIngredients[]> {
  const res = await fetch("/api/v1/recipes");
  if (!res.ok) throw new Error("Erreur chargement recettes");
  return res.json();
}

export function useRecipes(initialData?: RecipeWithIngredients[]) {
  return useQuery({ queryKey: RECIPES_KEY, queryFn: fetchRecipes, initialData, staleTime: 30_000 });
}

type RecipeInput = {
  name: string;
  description?: string;
  servings: number;
  salePrice: number;
  ingredients: { ingredientId: string; quantity: number }[];
};

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RecipeInput) => {
      const res = await fetch("/api/v1/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur création");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Recette créée");
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
    },
    onError: () => toast.error("Erreur lors de la création"),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<RecipeInput>) => {
      const res = await fetch(`/api/v1/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur modification");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Recette modifiée");
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
    },
    onSuccess: () => {
      toast.success("Recette supprimée");
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
