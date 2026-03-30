"use client";

import { useOrders } from "@/hooks/use-orders";
import { useOverheadCosts, useCreateOverhead, useDeleteOverhead } from "@/hooks/use-overhead-costs";
import { useStats } from "@/hooks/use-stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatARS } from "@/lib/utils";
import { computeOrderTotal, OVERHEAD_FREQUENCIES, PAYMENT_STATUS } from "@/types";
import type { OrderWithRelations, OverheadCost } from "@/types";
import type { Stats } from "@/hooks/use-stats";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  initialOrders: OrderWithRelations[];
  initialOverheads: OverheadCost[];
  initialStats: Stats;
}

export function AccountingTab({ initialOrders, initialOverheads, initialStats }: Props) {
  const { data: orders } = useOrders(initialOrders);
  const { data: overheads } = useOverheadCosts(initialOverheads);
  const { data: stats } = useStats(initialStats);
  const createOverhead = useCreateOverhead();
  const deleteOverhead = useDeleteOverhead();
  const [showAddCost, setShowAddCost] = useState(false);

  // Données pour le graphique (par mois)
  const chartData = buildMonthlyData(orders ?? []);

  return (
    <div className="space-y-6">
      {/* Résumé financier */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="CA encaissé" value={formatARS(stats?.revenue ?? 0)} color="text-green-700" />
        <SummaryCard label="Coût ingrédients" value={formatARS(stats?.ingredientCost ?? 0)} color="text-orange-700" />
        <SummaryCard label="Frais annexes" value={formatARS(stats?.overheadTotal ?? 0)} color="text-red-700" />
        <SummaryCard
          label="Bénéfice net"
          value={formatARS(stats?.profit ?? 0)}
          color={(stats?.profit ?? 0) >= 0 ? "text-primary font-bold" : "text-destructive font-bold"}
        />
      </div>

      {/* Graphique mensuel */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => typeof v === "number" ? formatARS(v) : v} />
                <Legend />
                <Bar dataKey="CA" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Coût" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Frais annexes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Frais annexes</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddCost(true)}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {overheads?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun frais annexe enregistré.</p>
          )}
          {overheads?.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {OVERHEAD_FREQUENCIES[c.frequency as keyof typeof OVERHEAD_FREQUENCIES]}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">{formatARS(c.amount)}</p>
                <Button size="icon" variant="ghost" onClick={() => deleteOverhead.mutate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau des commandes */}
      <div>
        <h3 className="font-semibold mb-3">Historique des commandes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Client</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Plats</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Total</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Payé</th>
                <th className="pb-2 font-medium text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => {
                const total = computeOrderTotal(order);
                return (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 pr-4 text-muted-foreground">
                      {format(new Date(order.orderedAt), "dd/MM/yy", { locale: fr })}
                    </td>
                    <td className="py-2 pr-4 font-medium">{order.client.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">
                      {order.items.map((i) => `${i.quantity}× ${i.recipe.name}`).join(", ")}
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatARS(total)}</td>
                    <td className="py-2 pr-4 text-right">
                      <span className={order.paidAmount >= total ? "text-green-600" : "text-yellow-600"}>
                        {formatARS(order.paidAmount)}
                      </span>
                    </td>
                    <td className="py-2">
                      <Badge
                        variant={
                          order.paymentStatus === "paid"
                            ? "success"
                            : order.paymentStatus === "partial"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {PAYMENT_STATUS[order.paymentStatus as keyof typeof PAYMENT_STATUS]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAddCost} onOpenChange={setShowAddCost}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un frais annexe</DialogTitle></DialogHeader>
          <OverheadForm
            onSubmit={(data) => createOverhead.mutate(data, { onSuccess: () => setShowAddCost(false) })}
            loading={createOverhead.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function buildMonthlyData(orders: OrderWithRelations[]) {
  const map = new Map<string, { CA: number; Coût: number }>();
  for (const order of orders) {
    const key = format(new Date(order.orderedAt), "MMM yy", { locale: fr });
    const total = computeOrderTotal(order);
    const existing = map.get(key) ?? { CA: 0, Coût: 0 };
    map.set(key, { CA: existing.CA + order.paidAmount, Coût: existing.Coût });
  }
  return Array.from(map.entries()).map(([month, data]) => ({ month, ...data }));
}

function OverheadForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: { name: string; amount: number; frequency: "once" | "monthly" }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, amount: parseFloat(amount), frequency });
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label>Nom *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gaz, emballages..." required />
      </div>
      <div className="space-y-1">
        <Label>Montant (ARS) *</Label>
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Fréquence</Label>
        <Select value={frequency} onChange={(e) => setFrequency(e.target.value as "once" | "monthly")}>
          <option value="once">Ponctuel</option>
          <option value="monthly">Mensuel</option>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading || !name || !amount}>
          {loading ? "Enregistrement..." : "Ajouter"}
        </Button>
      </DialogFooter>
    </form>
  );
}
