"use client";

import { useState } from "react";
import { useIngredients, useCreateIngredient, useAddPurchase, useDeleteIngredient } from "@/hooks/use-ingredients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatARS, formatUnit } from "@/lib/utils";
import { computeCostPerUnit, UNITS } from "@/types";
import type { IngredientWithPurchases } from "@/types";
import { Plus, ShoppingCart, Trash2, TrendingDown } from "lucide-react";

interface Props {
  initialData: IngredientWithPurchases[];
}

export function IngredientsTab({ initialData }: Props) {
  const { data: ingredients } = useIngredients(initialData);
  const createIngredient = useCreateIngredient();
  const addPurchase = useAddPurchase();
  const deleteIngredient = useDeleteIngredient();

  const [showCreate, setShowCreate] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<IngredientWithPurchases | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ingrédients ({ingredients?.length ?? 0})</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nouvel ingrédient
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ingredients?.map((ing) => (
          <IngredientCard
            key={ing.id}
            ingredient={ing}
            onPurchase={() => setPurchaseTarget(ing)}
            onDelete={() => deleteIngredient.mutate(ing.id)}
          />
        ))}
      </div>

      {/* Modal créer ingrédient */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel ingrédient</DialogTitle>
          </DialogHeader>
          <CreateIngredientForm
            onSubmit={(data) => {
              createIngredient.mutate(data, { onSuccess: () => setShowCreate(false) });
            }}
            loading={createIngredient.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal ajouter un achat */}
      <Dialog open={!!purchaseTarget} onOpenChange={(o) => !o && setPurchaseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Achat — {purchaseTarget?.name}</DialogTitle>
          </DialogHeader>
          {purchaseTarget && (
            <PurchaseForm
              unit={purchaseTarget.unit}
              onSubmit={(data) => {
                addPurchase.mutate(
                  { id: purchaseTarget.id, ...data },
                  { onSuccess: () => setPurchaseTarget(null) }
                );
              }}
              loading={addPurchase.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IngredientCard({
  ingredient,
  onPurchase,
  onDelete,
}: {
  ingredient: IngredientWithPurchases;
  onPurchase: () => void;
  onDelete: () => void;
}) {
  const cpu = computeCostPerUnit(ingredient);
  const totalPurchased = ingredient.purchases.reduce((s, p) => s + p.quantity, 0);
  const totalSpent = ingredient.purchases.reduce((s, p) => s + p.cost, 0);
  const stockLow = ingredient.stockQuantity < totalPurchased * 0.2;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{ingredient.name}</p>
          <p className="text-xs text-muted-foreground">{ingredient.unit}</p>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onPurchase} title="Enregistrer un achat">
            <ShoppingCart className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} title="Supprimer">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Stock restant</p>
          <p className={`font-semibold ${stockLow ? "text-destructive" : "text-foreground"}`}>
            {formatUnit(ingredient.stockQuantity, ingredient.unit)}
            {stockLow && <TrendingDown className="inline h-3 w-3 ml-1" />}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Coût / {ingredient.unit}</p>
          <p className="font-semibold">{cpu > 0 ? formatARS(cpu) : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total acheté</p>
          <p className="text-sm">{formatUnit(totalPurchased, ingredient.unit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total dépensé</p>
          <p className="text-sm">{totalSpent > 0 ? formatARS(totalSpent) : "—"}</p>
        </div>
      </div>

      {ingredient.purchases.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Derniers achats</p>
          <div className="space-y-1">
            {ingredient.purchases.slice(0, 2).map((p) => (
              <div key={p.id} className="flex justify-between text-xs">
                <span>{formatUnit(p.quantity, ingredient.unit)}</span>
                <span className="text-muted-foreground">{formatARS(p.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateIngredientForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: { name: string; unit: string; quantity?: number; cost?: number }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      unit,
      quantity: quantity ? parseFloat(quantity) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Nom</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Farine, tomate..." required />
      </div>
      <div className="space-y-1">
        <Label>Unité</Label>
        <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">Premier achat (optionnel)</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Quantité ({unit})</Label>
          <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1000" />
        </div>
        <div className="space-y-1">
          <Label>Coût total (ARS)</Label>
          <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="500" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading || !name}>
          {loading ? "Enregistrement..." : "Créer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PurchaseForm({
  unit,
  onSubmit,
  loading,
}: {
  unit: string;
  onSubmit: (data: { quantity: number; cost: number }) => void;
  loading: boolean;
}) {
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ quantity: parseFloat(quantity), cost: parseFloat(cost) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Quantité achetée ({unit})</Label>
        <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1000" required />
      </div>
      <div className="space-y-1">
        <Label>Coût total (ARS)</Label>
        <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="500" required />
      </div>
      {quantity && cost && (
        <p className="text-sm text-muted-foreground">
          → {formatARS(parseFloat(cost) / parseFloat(quantity))} / {unit}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={loading || !quantity || !cost}>
          {loading ? "Enregistrement..." : "Enregistrer l'achat"}
        </Button>
      </DialogFooter>
    </form>
  );
}
