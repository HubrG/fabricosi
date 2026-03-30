"use client";

import { useState } from "react";
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder } from "@/hooks/use-orders";
import { useClients } from "@/hooks/use-clients";
import { useRecipes } from "@/hooks/use-recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatARS } from "@/lib/utils";
import { computeOrderTotal, computeOrderBalance, ORDER_STATUS, PAYMENT_STATUS } from "@/types";
import type { OrderWithRelations, Client, RecipeWithIngredients } from "@/types";
import { Plus, Trash2, X, ChevronDown, Pencil } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  initialOrders: OrderWithRelations[];
  initialClients: Client[];
  initialRecipes: RecipeWithIngredients[];
}

export function OrdersTab({ initialOrders, initialClients, initialRecipes }: Props) {
  const { data: orders } = useOrders(initialOrders);
  const { data: clients } = useClients(initialClients);
  const { data: recipes } = useRecipes(initialRecipes);
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrderWithRelations | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Commandes ({orders?.length ?? 0})</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nouvelle commande
        </Button>
      </div>

      <div className="space-y-3">
        {orders?.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            onEdit={() => setEditing(order)}
            onDelete={() => deleteOrder.mutate(order.id)}
            onStatusChange={(status) => updateOrder.mutate({ id: order.id, status })}
            onPaymentChange={(paymentStatus, paidAmount) =>
              updateOrder.mutate({ id: order.id, paymentStatus, paidAmount })
            }
          />
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nouvelle commande</DialogTitle></DialogHeader>
          <OrderForm
            clients={clients ?? []}
            recipes={recipes ?? []}
            onSubmit={(data) => createOrder.mutate(data, { onSuccess: () => setShowCreate(false) })}
            loading={createOrder.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la commande</DialogTitle></DialogHeader>
          {editing && (
            <UpdateOrderForm
              order={editing}
              onSubmit={(data) => updateOrder.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })}
              loading={updateOrder.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderRow({
  order,
  onEdit,
  onDelete,
  onStatusChange,
  onPaymentChange,
}: {
  order: OrderWithRelations;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: "pending" | "preparing" | "ready" | "delivered") => void;
  onPaymentChange: (s: "unpaid" | "partial" | "paid", amount: number) => void;
}) {
  const total = computeOrderTotal(order);
  const balance = computeOrderBalance(order);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{order.client.name}</p>
            <span className="text-xs text-muted-foreground">
              {format(new Date(order.orderedAt), "dd MMM yyyy", { locale: fr })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {order.items.map((i) => `${i.quantity}× ${i.recipe.name}`).join(" · ")}
          </p>
          {order.notes && <p className="text-xs text-muted-foreground italic mt-1">{order.notes}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold">{formatARS(total)}</p>
          {balance > 0 && <p className="text-xs text-destructive">Reste: {formatARS(balance)}</p>}
          {order.paidAmount > 0 && balance > 0 && (
            <p className="text-xs text-muted-foreground">Payé: {formatARS(order.paidAmount)}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Statut préparation */}
        <select
          value={order.status}
          onChange={(e) => onStatusChange(e.target.value as "pending" | "preparing" | "ready" | "delivered")}
          className="h-7 rounded-full border px-2 text-xs bg-background"
        >
          {Object.entries(ORDER_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        {/* Statut paiement */}
        <select
          value={order.paymentStatus}
          onChange={(e) => {
            const ps = e.target.value as "unpaid" | "partial" | "paid";
            const amount = ps === "paid" ? total : ps === "unpaid" ? 0 : order.paidAmount;
            onPaymentChange(ps, amount);
          }}
          className="h-7 rounded-full border px-2 text-xs bg-background"
        >
          {Object.entries(PAYMENT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        {order.paymentStatus === "partial" && (
          <span className="text-xs text-muted-foreground">
            ({formatARS(order.paidAmount)} payé)
          </span>
        )}

        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

type ItemLine = { recipeId: string; quantity: string };

function OrderForm({
  clients,
  recipes,
  onSubmit,
  loading,
}: {
  clients: Client[];
  recipes: RecipeWithIngredients[];
  onSubmit: (data: { clientId: string; notes?: string; items: { recipeId: string; quantity: number; unitPrice: number }[] }) => void;
  loading: boolean;
}) {
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ItemLine[]>([{ recipeId: "", quantity: "1" }]);

  const addLine = () => setLines((l) => [...l, { recipeId: "", quantity: "1" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof ItemLine, value: string) =>
    setLines((l) => l.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));

  const total = lines.reduce((sum, line) => {
    const recipe = recipes.find((r) => r.id === line.recipeId);
    if (!recipe || !line.quantity) return sum;
    return sum + recipe.salePrice * parseInt(line.quantity);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.recipeId && l.quantity);
    const recipe = (id: string) => recipes.find((r) => r.id === id)!;
    onSubmit({
      clientId,
      notes: notes || undefined,
      items: validLines.map((l) => ({
        recipeId: l.recipeId,
        quantity: parseInt(l.quantity),
        unitPrice: recipe(l.recipeId).salePrice,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Client *</Label>
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
          <option value="">Choisir un client...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Plats commandés</Label>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const recipe = recipes.find((r) => r.id === line.recipeId);
            return (
              <div key={i} className="flex gap-2 items-center">
                <Select
                  value={line.recipeId}
                  onChange={(e) => updateLine(i, "recipeId", e.target.value)}
                  className="flex-1"
                >
                  <option value="">Choisir un plat...</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} — {formatARS(r.salePrice)}/portion</option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  className="w-20"
                  placeholder="qté"
                />
                {recipe && line.quantity && (
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {formatARS(recipe.salePrice * parseInt(line.quantity))}
                  </span>
                )}
                <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {total > 0 && (
        <div className="rounded-lg bg-muted px-4 py-3 flex justify-between font-semibold">
          <span>Total commande</span>
          <span>{formatARS(total)}</span>
        </div>
      )}

      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Instructions spéciales, allergies..." />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading || !clientId || lines.every((l) => !l.recipeId)}>
          {loading ? "Création..." : "Créer la commande"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function UpdateOrderForm({
  order,
  onSubmit,
  loading,
}: {
  order: OrderWithRelations;
  onSubmit: (data: { paymentStatus?: "unpaid" | "partial" | "paid"; paidAmount?: number; notes?: string; deliveredAt?: string | null }) => void;
  loading: boolean;
}) {
  const total = computeOrderTotal(order);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus as "unpaid" | "partial" | "paid");
  const [paidAmount, setPaidAmount] = useState(order.paidAmount.toString());
  const [notes, setNotes] = useState(order.notes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          paymentStatus,
          paidAmount: parseFloat(paidAmount) || 0,
          notes: notes || undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label>Statut paiement</Label>
        <Select value={paymentStatus} onChange={(e) => {
          const ps = e.target.value as "unpaid" | "partial" | "paid";
          setPaymentStatus(ps);
          if (ps === "paid") setPaidAmount(total.toString());
          if (ps === "unpaid") setPaidAmount("0");
        }}>
          {Object.entries(PAYMENT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
      {(paymentStatus === "partial" || paymentStatus === "paid") && (
        <div className="space-y-1">
          <Label>Montant reçu (ARS) — Total: {formatARS(total)}</Label>
          <Input
            type="number"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            max={total}
          />
        </div>
      )}
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
