"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { OrderWithRelations } from "@/types";

export const ORDERS_KEY = ["orders"] as const;

async function fetchOrders(): Promise<OrderWithRelations[]> {
  const res = await fetch("/api/v1/orders");
  if (!res.ok) throw new Error("Erreur chargement commandes");
  return res.json();
}

export function useOrders(initialData?: OrderWithRelations[]) {
  return useQuery({ queryKey: ORDERS_KEY, queryFn: fetchOrders, initialData, staleTime: 30_000 });
}

type OrderItemInput = { recipeId: string; quantity: number; unitPrice: number };
type OrderInput = { clientId: string; notes?: string; orderedAt?: string; items: OrderItemInput[] };

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: OrderInput) => {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur création");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Commande créée");
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
    },
    onError: () => toast.error("Erreur lors de la création"),
  });
}

type OrderUpdate = {
  id: string;
  status?: "pending" | "preparing" | "ready" | "delivered";
  paymentStatus?: "unpaid" | "partial" | "paid";
  paidAmount?: number;
  notes?: string;
  deliveredAt?: string | null;
};

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: OrderUpdate) => {
      const res = await fetch(`/api/v1/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur modification");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Commande mise à jour");
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      // Recharger aussi les ingrédients (stock peut avoir changé)
      qc.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
    },
    onSuccess: () => {
      toast.success("Commande supprimée");
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
