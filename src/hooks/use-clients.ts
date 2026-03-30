"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Client } from "@/types";

export const CLIENTS_KEY = ["clients"] as const;

async function fetchClients(): Promise<Client[]> {
  const res = await fetch("/api/v1/clients");
  if (!res.ok) throw new Error("Erreur chargement clients");
  return res.json();
}

export function useClients(initialData?: Client[]) {
  return useQuery({ queryKey: CLIENTS_KEY, queryFn: fetchClients, initialData, staleTime: 30_000 });
}

type ClientInput = { name: string; phone?: string; address?: string; notes?: string };

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClientInput) => {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur création");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Client ajouté");
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ClientInput>) => {
      const res = await fetch(`/api/v1/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur modification");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Client modifié");
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
    },
    onSuccess: () => {
      toast.success("Client supprimé");
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
