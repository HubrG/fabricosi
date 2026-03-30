"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { IngredientWithPurchases } from "@/types";

export const INGREDIENTS_KEY = ["ingredients"] as const;

async function fetchIngredients(): Promise<IngredientWithPurchases[]> {
  const res = await fetch("/api/v1/ingredients");
  if (!res.ok) throw new Error("Erreur chargement ingrédients");
  return res.json();
}

export function useIngredients(initialData?: IngredientWithPurchases[]) {
  return useQuery({ queryKey: INGREDIENTS_KEY, queryFn: fetchIngredients, initialData, staleTime: 30_000 });
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; unit: string; quantity?: number; cost?: number }) => {
      const res = await fetch("/api/v1/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur création");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ingrédient ajouté");
      qc.invalidateQueries({ queryKey: INGREDIENTS_KEY });
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });
}

export function useAddPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity, cost }: { id: string; quantity: number; cost: number }) => {
      const res = await fetch(`/api/v1/ingredients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purchase", quantity, cost }),
      });
      if (!res.ok) throw new Error("Erreur achat");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Achat enregistré");
      qc.invalidateQueries({ queryKey: INGREDIENTS_KEY });
    },
    onError: () => toast.error("Erreur lors de l'achat"),
  });
}

export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; unit?: string }) => {
      const res = await fetch(`/api/v1/ingredients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur modification");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ingrédient modifié");
      qc.invalidateQueries({ queryKey: INGREDIENTS_KEY });
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
    },
    onSuccess: () => {
      toast.success("Ingrédient supprimé");
      qc.invalidateQueries({ queryKey: INGREDIENTS_KEY });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
