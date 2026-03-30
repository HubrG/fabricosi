"use client";

import { useState } from "react";
import { useRecipes, useCreateRecipe, useDeleteRecipe } from "@/hooks/use-recipes";
import { useIngredients } from "@/hooks/use-ingredients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatARS, formatUnit } from "@/lib/utils";
import {
  computeCostPerUnit,
  computeRecipeCost,
  computeCostPerServing,
  computeMarginPerServing,
} from "@/types";
import type { RecipeWithIngredients, IngredientWithPurchases } from "@/types";
import { Plus, Trash2, ChefHat, X } from "lucide-react";

interface Props {
  initialRecipes: RecipeWithIngredients[];
  initialIngredients: IngredientWithPurchases[];
}

export function RecipesTab({ initialRecipes, initialIngredients }: Props) {
  const { data: recipes } = useRecipes(initialRecipes);
  const { data: ingredients } = useIngredients(initialIngredients);
  const createRecipe = useCreateRecipe();
  const deleteRecipe = useDeleteRecipe();

  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<RecipeWithIngredients | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recettes ({recipes?.length ?? 0})</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nouvelle recette
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recipes?.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onDetail={() => setDetail(recipe)}
            onDelete={() => deleteRecipe.mutate(recipe.id)}
          />
        ))}
      </div>

      {/* Modal créer recette */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle recette</DialogTitle>
          </DialogHeader>
          <CreateRecipeForm
            ingredients={ingredients ?? []}
            onSubmit={(data) => createRecipe.mutate(data, { onSuccess: () => setShowCreate(false) })}
            loading={createRecipe.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal détail recette */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && <RecipeDetail recipe={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecipeCard({
  recipe,
  onDetail,
  onDelete,
}: {
  recipe: RecipeWithIngredients;
  onDetail: () => void;
  onDelete: () => void;
}) {
  const cost = computeRecipeCost(recipe);
  const costPerServing = computeCostPerServing(recipe);
  const margin = computeMarginPerServing(recipe);
  const marginPct = recipe.salePrice > 0 ? (margin / recipe.salePrice) * 100 : 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between">
        <div onClick={onDetail} className="flex-1">
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-primary" />
            <p className="font-medium">{recipe.name}</p>
          </div>
          {recipe.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm" onClick={onDetail}>
        <div>
          <p className="text-xs text-muted-foreground">Coût total</p>
          <p className="font-semibold">{formatARS(cost)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Coût / portion</p>
          <p className="font-semibold">{formatARS(costPerServing)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Prix de vente</p>
          <p className="font-semibold text-primary">{formatARS(recipe.salePrice)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Marge / portion</p>
          <p className={`font-semibold ${margin >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatARS(margin)} ({marginPct.toFixed(0)}%)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{recipe.servings} portion{recipe.servings > 1 ? "s" : ""}</Badge>
        <Badge variant="outline">{recipe.ingredients.length} ingrédient{recipe.ingredients.length > 1 ? "s" : ""}</Badge>
      </div>
    </div>
  );
}

function RecipeDetail({ recipe }: { recipe: RecipeWithIngredients }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Coût total</p>
          <p className="font-bold">{formatARS(computeRecipeCost(recipe))}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Prix vente</p>
          <p className="font-bold text-primary">{formatARS(recipe.salePrice)}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Marge/portion</p>
          <p className={`font-bold ${computeMarginPerServing(recipe) >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatARS(computeMarginPerServing(recipe))}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Composition ({recipe.servings} portion{recipe.servings > 1 ? "s" : ""})</p>
        <div className="space-y-2">
          {recipe.ingredients.map((ri) => {
            const cpu = computeCostPerUnit(ri.ingredient);
            const lineCost = ri.quantity * cpu;
            return (
              <div key={ri.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{ri.ingredient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatUnit(ri.quantity, ri.ingredient.unit)} × {formatARS(cpu)}/{ri.ingredient.unit}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatARS(lineCost)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type IngredientLine = { ingredientId: string; quantity: string };

function CreateRecipeForm({
  ingredients,
  onSubmit,
  loading,
}: {
  ingredients: IngredientWithPurchases[];
  onSubmit: (data: {
    name: string;
    description?: string;
    servings: number;
    salePrice: number;
    ingredients: { ingredientId: string; quantity: number }[];
  }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("1");
  const [salePrice, setSalePrice] = useState("");
  const [lines, setLines] = useState<IngredientLine[]>([{ ingredientId: "", quantity: "" }]);

  const addLine = () => setLines((l) => [...l, { ingredientId: "", quantity: "" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof IngredientLine, value: string) =>
    setLines((l) => l.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));

  const selectedIngredients = lines.map((l) => ingredients.find((i) => i.id === l.ingredientId));

  const estimatedCost = lines.reduce((sum, line, idx) => {
    const ing = selectedIngredients[idx];
    if (!ing || !line.quantity) return sum;
    const cpu = computeCostPerUnit(ing);
    return sum + parseFloat(line.quantity) * cpu;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.ingredientId && l.quantity);
    onSubmit({
      name,
      description: description || undefined,
      servings: parseInt(servings),
      salePrice: parseFloat(salePrice),
      ingredients: validLines.map((l) => ({
        ingredientId: l.ingredientId,
        quantity: parseFloat(l.quantity),
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Nom de la recette</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Empanadas, asado..." required />
        </div>
        <div className="space-y-1">
          <Label>Portions produites</Label>
          <Input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Prix de vente / portion (ARS)</Label>
          <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="500" required />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description (optionnel)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Ingrédients</Label>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const ing = selectedIngredients[i];
            return (
              <div key={i} className="flex gap-2 items-center">
                <Select
                  value={line.ingredientId}
                  onChange={(e) => updateLine(i, "ingredientId", e.target.value)}
                  className="flex-1"
                >
                  <option value="">Choisir...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={ing ? `qté (${ing.unit})` : "quantité"}
                  value={line.quantity}
                  onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  className="w-28"
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {estimatedCost > 0 && salePrice && (
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Coût ingrédients total</span>
            <span className="font-medium">{formatARS(estimatedCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Coût / portion</span>
            <span className="font-medium">{formatARS(estimatedCost / parseInt(servings || "1"))}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Marge / portion</span>
            <span className={parseFloat(salePrice) - estimatedCost / parseInt(servings || "1") >= 0 ? "text-green-600" : "text-destructive"}>
              {formatARS(parseFloat(salePrice) - estimatedCost / parseInt(servings || "1"))}
            </span>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={loading || !name || !salePrice}>
          {loading ? "Création..." : "Créer la recette"}
        </Button>
      </DialogFooter>
    </form>
  );
}
