"use client";

import { useQuery } from "@tanstack/react-query";

export type Stats = {
  revenue: number;
  invoiced: number;
  balance: number;
  ingredientCost: number;
  overheadTotal: number;
  profit: number;
  pendingCount: number;
  preparingCount: number;
  deliveredCount: number;
  totalOrders: number;
};

export const STATS_KEY = ["stats"] as const;

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/v1/stats");
  if (!res.ok) throw new Error("Erreur chargement stats");
  return res.json();
}

export function useStats(initialData?: Stats) {
  return useQuery({ queryKey: STATS_KEY, queryFn: fetchStats, initialData, staleTime: 30_000 });
}
