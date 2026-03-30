"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { OverheadCost } from "@/types";

export const OVERHEAD_KEY = ["overhead-costs"] as const;

async function fetchOverheads(): Promise<OverheadCost[]> {
  const res = await fetch("/api/v1/overhead-costs");
  if (!res.ok) throw new Error("Erreur chargement frais");
  return res.json();
}

export function useOverheadCosts(initialData?: OverheadCost[]) {
  return useQuery({ queryKey: OVERHEAD_KEY, queryFn: fetchOverheads, initialData, staleTime: 30_000 });
}

type OverheadInput = { name: string; amount: number; frequency: "once" | "monthly" };

export function useCreateOverhead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: OverheadInput) => {
      const res = await fetch("/api/v1/overhead-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur création");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Frais ajouté");
      qc.invalidateQueries({ queryKey: OVERHEAD_KEY });
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });
}

export function useDeleteOverhead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/overhead-costs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
    },
    onSuccess: () => {
      toast.success("Frais supprimé");
      qc.invalidateQueries({ queryKey: OVERHEAD_KEY });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
