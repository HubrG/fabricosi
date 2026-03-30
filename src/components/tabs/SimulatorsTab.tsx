"use client";

import { useState, useMemo } from "react";
import { useRecipes } from "@/hooks/use-recipes";
import { useOverheadCosts } from "@/hooks/use-overhead-costs";
import { useOrders } from "@/hooks/use-orders";
import { useStats } from "@/hooks/use-stats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatARS } from "@/lib/utils";
import {
  computeRecipeCost,
  computeCostPerServing,
  computeMarginPerServing,
  computeOrderTotal,
} from "@/types";
import type { RecipeWithIngredients, OverheadCost, OrderWithRelations } from "@/types";
import type { Stats } from "@/hooks/use-stats";
import {
  TrendingUp,
  BarChart2,
  Target,
  Zap,
  Plus,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  initialRecipes: RecipeWithIngredients[];
  initialOverheads: OverheadCost[];
  initialOrders: OrderWithRelations[];
  initialStats: Stats;
}

type SimTab = "revenue" | "compare" | "breakeven" | "whatif";

export function SimulatorsTab({ initialRecipes, initialOverheads, initialOrders, initialStats }: Props) {
  const { data: recipes } = useRecipes(initialRecipes);
  const { data: overheads } = useOverheadCosts(initialOverheads);
  const { data: orders } = useOrders(initialOrders);
  const { data: stats } = useStats(initialStats);
  const [active, setActive] = useState<SimTab>("revenue");

  const sims: { id: SimTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "revenue", label: "CA projeté", icon: <TrendingUp className="h-4 w-4" />, desc: "Projette ton CA à partir de tes chiffres réels" },
    { id: "compare", label: "Comparateur", icon: <BarChart2 className="h-4 w-4" />, desc: "Compare la rentabilité de tes recettes" },
    { id: "breakeven", label: "Rentabilité", icon: <Target className="h-4 w-4" />, desc: "Seuil de rentabilité par recette" },
    { id: "whatif", label: "Et si...", icon: <Zap className="h-4 w-4" />, desc: "Simule l'impact d'un changement de prix ou de coût" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sims.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`rounded-xl border p-4 text-left transition-all hover:border-primary/50 ${
              active === s.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
            }`}
          >
            <div className={`mb-2 ${active === s.id ? "text-primary" : "text-muted-foreground"}`}>{s.icon}</div>
            <p className="text-sm font-semibold">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.desc}</p>
          </button>
        ))}
      </div>

      <div>
        {active === "revenue" && <RevenueSimulator recipes={recipes ?? []} orders={orders ?? []} stats={stats ?? initialStats} />}
        {active === "compare" && <RecipeCompare recipes={recipes ?? []} />}
        {active === "breakeven" && <BreakevenSimulator recipes={recipes ?? []} overheads={overheads ?? []} />}
        {active === "whatif" && <WhatIfSimulator recipes={recipes ?? []} orders={orders ?? []} />}
      </div>
    </div>
  );
}

// ─── Simulateur CA projeté ────────────────────────────────────────────────────

function RevenueSimulator({
  recipes,
  orders,
  stats,
}: {
  recipes: RecipeWithIngredients[];
  orders: OrderWithRelations[];
  stats: Stats;
}) {
  const [growthRate, setGrowthRate] = useState(10); // %

  // Historique mensuel réel
  const monthlyHistory = useMemo(() => {
    const map = new Map<string, { ca: number; cost: number; orders: number }>();
    for (const order of orders) {
      const key = format(new Date(order.orderedAt), "MMM yy", { locale: fr });
      const total = computeOrderTotal(order);
      const existing = map.get(key) ?? { ca: 0, cost: 0, orders: 0 };
      map.set(key, {
        ca: existing.ca + order.paidAmount,
        cost: existing.cost,
        orders: existing.orders + 1,
      });
    }
    return Array.from(map.entries()).map(([month, d]) => ({ month, ...d }));
  }, [orders]);

  // CA de référence = dernier mois réel (ou moyenne si < 2 mois)
  const refCA = useMemo(() => {
    if (monthlyHistory.length === 0) return stats.revenue;
    if (monthlyHistory.length === 1) return monthlyHistory[0].ca;
    return monthlyHistory[monthlyHistory.length - 1].ca;
  }, [monthlyHistory, stats.revenue]);

  const refProfit = stats.profit;

  // Projection 6 mois
  const projection = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const factor = Math.pow(1 + growthRate / 100, i + 1);
      const projCA = refCA * factor;
      const projProfit = refProfit * factor;
      return {
        month: `M+${i + 1}`,
        "CA réel": i === 0 ? Math.round(refCA) : undefined,
        "CA projeté": Math.round(projCA),
        "Bénéfice projeté": Math.round(projProfit),
      };
    });
  }, [refCA, refProfit, growthRate]);

  const chartData = [
    ...monthlyHistory.map((m) => ({
      month: m.month,
      "CA réel": Math.round(m.ca),
      "CA projeté": undefined as number | undefined,
      "Bénéfice projeté": undefined as number | undefined,
    })),
    ...projection,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>CA projeté</CardTitle>
        <CardDescription>
          Base réelle : <strong>{formatARS(refCA)}/mois</strong>
          {monthlyHistory.length > 0 ? ` (${monthlyHistory.length} mois d'historique)` : " (total encaissé)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Slider croissance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Taux de croissance mensuel</Label>
            <span className={`text-lg font-bold ${growthRate > 0 ? "text-green-600" : growthRate < 0 ? "text-destructive" : "text-foreground"}`}>
              {growthRate > 0 ? "+" : ""}{growthRate}%
            </span>
          </div>
          <input
            type="range"
            min="-20"
            max="100"
            step="1"
            value={growthRate}
            onChange={(e) => setGrowthRate(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-20%</span>
            <span>0%</span>
            <span>+50%</span>
            <span>+100%</span>
          </div>
        </div>

        {/* KPIs projection M+6 */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 3, 6].map((m) => {
            const factor = Math.pow(1 + growthRate / 100, m);
            return (
              <div key={m} className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Dans {m} mois</p>
                <p className="mt-1 text-base font-bold text-primary">{formatARS(refCA * factor)}</p>
                <p className="text-xs text-muted-foreground">CA/mois</p>
                <p className={`text-sm font-semibold mt-1 ${refProfit * factor >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {formatARS(refProfit * factor)}
                </p>
                <p className="text-xs text-muted-foreground">bénéfice</p>
              </div>
            );
          })}
        </div>

        {/* Graphique historique + projection */}
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => typeof v === "number" ? formatARS(v) : v} />
            <Legend />
            <Line type="monotone" dataKey="CA réel" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
            <Line type="monotone" dataKey="CA projeté" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls={false} />
            <Line type="monotone" dataKey="Bénéfice projeté" stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>

        {/* Récapitulatif recettes top */}
        {recipes.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Top recettes par marge</p>
            <div className="space-y-2">
              {[...recipes]
                .sort((a, b) => computeMarginPerServing(b) - computeMarginPerServing(a))
                .slice(0, 3)
                .map((r) => {
                  const margin = computeMarginPerServing(r);
                  const pct = r.salePrice > 0 ? (margin / r.salePrice) * 100 : 0;
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={pct >= 50 ? "success" : pct >= 30 ? "warning" : "destructive"}>
                          {pct.toFixed(0)}% marge
                        </Badge>
                        <span className="text-sm font-semibold text-green-600">{formatARS(margin)}/portion</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Comparateur de recettes ──────────────────────────────────────────────────

function RecipeCompare({ recipes }: { recipes: RecipeWithIngredients[] }) {
  const data = recipes.map((r) => {
    const cost = computeRecipeCost(r);
    const costPerServing = computeCostPerServing(r);
    const margin = computeMarginPerServing(r);
    const marginPct = r.salePrice > 0 ? (margin / r.salePrice) * 100 : 0;
    const roi = costPerServing > 0 ? (margin / costPerServing) * 100 : 0;
    return { recipe: r, cost, costPerServing, margin, marginPct, roi };
  });

  const chartData = data.map((d) => ({
    name: d.recipe.name.slice(0, 14),
    "Coût/portion": Math.round(d.costPerServing),
    "Prix vente": d.recipe.salePrice,
    "Marge": Math.round(d.margin),
  }));

  const best = data.length > 0 ? data.reduce((a, b) => (a.marginPct > b.marginPct ? a : b)) : null;
  const worst = data.length > 0 ? data.reduce((a, b) => (a.marginPct < b.marginPct ? a : b)) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparateur de recettes</CardTitle>
        <CardDescription>Toutes tes recettes classées par marge décroissante.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune recette créée.</p>
        ) : (
          <>
            <div className="flex gap-4">
              {best && (
                <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Meilleure marge</p>
                  <p className="font-bold text-green-700 dark:text-green-400">{best.recipe.name}</p>
                  <p className="text-sm">{formatARS(best.margin)}/portion ({best.marginPct.toFixed(0)}%)</p>
                </div>
              )}
              {worst && worst.recipe.id !== best?.recipe.id && (
                <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">Marge la plus faible</p>
                  <p className="font-bold text-red-700 dark:text-red-400">{worst.recipe.name}</p>
                  <p className="text-sm">{formatARS(worst.margin)}/portion ({worst.marginPct.toFixed(0)}%)</p>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Recette</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Coût/portion</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Prix vente</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Marge</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Marge %</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].sort((a, b) => b.marginPct - a.marginPct).map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{d.recipe.name}</td>
                      <td className="py-2 pr-3 text-right text-orange-600">{formatARS(d.costPerServing)}</td>
                      <td className="py-2 pr-3 text-right text-primary font-semibold">{formatARS(d.recipe.salePrice)}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-green-600">{formatARS(d.margin)}</td>
                      <td className="py-2 pr-3 text-right">
                        <Badge variant={d.marginPct >= 50 ? "success" : d.marginPct >= 30 ? "warning" : "destructive"}>
                          {d.marginPct.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{d.roi.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => typeof v === "number" ? formatARS(v) : v} />
                <Legend />
                <Bar dataKey="Coût/portion" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prix vente" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Marge" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Seuil de rentabilité ────────────────────────────────────────────────────

function BreakevenSimulator({
  recipes,
  overheads,
}: {
  recipes: RecipeWithIngredients[];
  overheads: OverheadCost[];
}) {
  const [recipeId, setRecipeId] = useState("");
  const [extraFixedCost, setExtraFixedCost] = useState("");

  const recipe = recipes.find((r) => r.id === recipeId);
  const totalOverheads = overheads.reduce((s, c) => s + c.amount, 0);
  const extra = parseFloat(extraFixedCost) || 0;
  const fixedCosts = totalOverheads + extra;

  const margin = recipe ? computeMarginPerServing(recipe) : 0;
  const breakeven = margin > 0 ? Math.ceil(fixedCosts / margin) : null;

  const chartData = breakeven && recipe
    ? Array.from({ length: Math.min(breakeven * 2, 120) }, (_, i) => {
        const portions = i + 1;
        return {
          portions,
          "Revenus": Math.round(recipe.salePrice * portions),
          "Coûts totaux": Math.round(computeCostPerServing(recipe) * portions + fixedCosts),
        };
      })
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seuil de rentabilité</CardTitle>
        <CardDescription>Nombre minimal de portions pour couvrir tous tes frais fixes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Recette</Label>
            <Select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              <option value="">Choisir...</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Frais fixes supplémentaires (ARS)</Label>
            <Input type="number" value={extraFixedCost} onChange={(e) => setExtraFixedCost(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <p>Frais annexes enregistrés : <span className="font-semibold">{formatARS(totalOverheads)}</span></p>
          <p>Frais fixes totaux : <span className="font-semibold">{formatARS(fixedCosts)}</span></p>
          {recipe && <p>Marge / portion : <span className="font-semibold">{formatARS(margin)}</span></p>}
        </div>

        {recipe && (
          <>
            {breakeven !== null && margin > 0 ? (
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 text-center">
                <p className="text-sm text-muted-foreground">Seuil de rentabilité</p>
                <p className="text-5xl font-bold text-primary">{breakeven}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  portions de <strong>{recipe.name}</strong> pour couvrir {formatARS(fixedCosts)} de frais
                </p>
                <p className="mt-2 text-xs text-muted-foreground">= {formatARS(recipe.salePrice * breakeven)} de CA minimum</p>
              </div>
            ) : (
              <p className="text-sm text-destructive">Marge nulle ou négative — impossible d&apos;atteindre la rentabilité.</p>
            )}

            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={3}>
                  <XAxis dataKey="portions" tick={{ fontSize: 10 }} label={{ value: "portions", position: "insideBottom", offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => typeof v === "number" ? formatARS(v) : v} />
                  <Legend />
                  <ReferenceLine x={breakeven ?? 0} stroke="var(--color-primary)" strokeDasharray="4 2" label={{ value: "Seuil", fontSize: 10 }} />
                  <Bar dataKey="Revenus" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Coûts totaux" fill="#f97316" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Simulateur "Et si..." ────────────────────────────────────────────────────

function WhatIfSimulator({
  recipes,
  orders,
}: {
  recipes: RecipeWithIngredients[];
  orders: OrderWithRelations[];
}) {
  const [recipeId, setRecipeId] = useState("");
  const [priceChange, setPriceChange] = useState(0);
  const [costChange, setCostChange] = useState(0);

  const recipe = recipes.find((r) => r.id === recipeId);

  // Portions réellement vendues de cette recette
  const realPortions = useMemo(() => {
    if (!recipeId) return 0;
    return orders.reduce((sum, o) => {
      return sum + o.items.filter((i) => i.recipeId === recipeId).reduce((s, i) => s + i.quantity, 0);
    }, 0);
  }, [orders, recipeId]);

  const baseCostPerServing = recipe ? computeCostPerServing(recipe) : 0;
  const baseMargin = recipe ? computeMarginPerServing(recipe) : 0;
  const baseMarginPct = recipe && recipe.salePrice > 0 ? (baseMargin / recipe.salePrice) * 100 : 0;

  const newPrice = recipe ? recipe.salePrice * (1 + priceChange / 100) : 0;
  const newCostPerServing = baseCostPerServing * (1 + costChange / 100);
  const newMargin = newPrice - newCostPerServing;
  const newMarginPct = newPrice > 0 ? (newMargin / newPrice) * 100 : 0;

  const n = realPortions || 50;
  const baseTotal = baseMargin * n;
  const newTotal = newMargin * n;
  const diff = newTotal - baseTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulateur « Et si... »</CardTitle>
        <CardDescription>
          Mesure l&apos;impact d&apos;une variation de prix ou de coût sur tes chiffres réels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <Label>Recette</Label>
          <Select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            <option value="">Choisir...</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
          {recipe && realPortions > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Base réelle : <strong>{realPortions} portions vendues</strong> → {formatARS(baseMargin * realPortions)} de bénéfice
            </p>
          )}
        </div>

        {recipe && (
          <>
            {/* Slider prix de vente */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Variation du prix de vente</Label>
                <span className={`text-base font-bold ${priceChange > 0 ? "text-green-600" : priceChange < 0 ? "text-destructive" : "text-foreground"}`}>
                  {priceChange > 0 ? "+" : ""}{priceChange}%
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {formatARS(recipe.salePrice)} → {formatARS(newPrice)}
                  </span>
                </span>
              </div>
              <input
                type="range" min="-50" max="100" step="1"
                value={priceChange}
                onChange={(e) => setPriceChange(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50%</span><span>0%</span><span>+50%</span><span>+100%</span>
              </div>
            </div>

            {/* Slider coût ingrédients */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Variation du coût des ingrédients</Label>
                <span className={`text-base font-bold ${costChange < 0 ? "text-green-600" : costChange > 0 ? "text-destructive" : "text-foreground"}`}>
                  {costChange > 0 ? "+" : ""}{costChange}%
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {formatARS(baseCostPerServing)} → {formatARS(newCostPerServing)}
                  </span>
                </span>
              </div>
              <input
                type="range" min="-50" max="100" step="1"
                value={costChange}
                onChange={(e) => setCostChange(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50%</span><span>0%</span><span>+50%</span><span>+100%</span>
              </div>
            </div>

            {/* Comparaison */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Actuel", price: recipe.salePrice, cost: baseCostPerServing, margin: baseMargin, marginPct: baseMarginPct, total: baseTotal, isNew: false },
                { label: "Simulé", price: newPrice, cost: newCostPerServing, margin: newMargin, marginPct: newMarginPct, total: newTotal, isNew: true },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-lg border p-4 ${
                    s.isNew
                      ? newMargin > baseMargin
                        ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                        : newMargin < baseMargin
                        ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                        : "border-border bg-muted/40"
                      : "border-border bg-muted/40"
                  }`}
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Prix vente</span><span className="font-semibold">{formatARS(s.price)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Coût/portion</span><span className="text-orange-600">{formatARS(s.cost)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Marge/portion</span>
                      <span className={`font-semibold ${s.margin >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {formatARS(s.margin)} ({s.marginPct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5">
                      <span className="text-muted-foreground">Bénéfice ({n} portions)</span>
                      <span className={`font-bold ${s.total >= 0 ? "text-green-600" : "text-destructive"}`}>{formatARS(s.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Impact */}
            <div className={`rounded-xl p-4 text-center ${diff > 0 ? "bg-green-100 dark:bg-green-950/30" : diff < 0 ? "bg-red-100 dark:bg-red-950/30" : "bg-muted"}`}>
              <p className="text-xs text-muted-foreground">Impact sur {n} portions</p>
              <p className={`text-4xl font-bold ${diff > 0 ? "text-green-700" : diff < 0 ? "text-destructive" : "text-foreground"}`}>
                {diff > 0 ? "+" : ""}{formatARS(diff)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {diff > 0 ? "gain supplémentaire" : diff < 0 ? "perte" : "aucun changement"}
                {realPortions > 0 ? ` (basé sur ${realPortions} portions réellement vendues)` : ""}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
