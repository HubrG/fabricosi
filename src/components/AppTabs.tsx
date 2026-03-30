"use client";

import { Tabs } from "radix-ui";
import { DashboardTab } from "./tabs/DashboardTab";
import { IngredientsTab } from "./tabs/IngredientsTab";
import { RecipesTab } from "./tabs/RecipesTab";
import { ClientsTab } from "./tabs/ClientsTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { AccountingTab } from "./tabs/AccountingTab";
import { SimulatorsTab } from "./tabs/SimulatorsTab";
import type { IngredientWithPurchases, RecipeWithIngredients, Client, OrderWithRelations, OverheadCost } from "@/types";
import type { Stats } from "@/hooks/use-stats";
import { LayoutDashboard, Package, ChefHat, Users, ShoppingBag, Calculator, FlaskConical } from "lucide-react";

interface Props {
  initialIngredients: IngredientWithPurchases[];
  initialRecipes: RecipeWithIngredients[];
  initialClients: Client[];
  initialOrders: OrderWithRelations[];
  initialOverheads: OverheadCost[];
  initialStats: Stats;
}

const TABS = [
  { value: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { value: "ingredients", label: "Ingrédients", icon: Package },
  { value: "recipes", label: "Recettes", icon: ChefHat },
  { value: "clients", label: "Clients", icon: Users },
  { value: "orders", label: "Commandes", icon: ShoppingBag },
  { value: "accounting", label: "Comptabilité", icon: Calculator },
  { value: "simulators", label: "Simulateurs", icon: FlaskConical },
] as const;

export function AppTabs({
  initialIngredients,
  initialRecipes,
  initialClients,
  initialOrders,
  initialOverheads,
  initialStats,
}: Props) {
  return (
    <Tabs.Root defaultValue="dashboard" className="w-full">
      {/* Tab list */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <Tabs.List className="flex overflow-x-auto scrollbar-none px-4 gap-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      {/* Panels */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Tabs.Content value="dashboard">
          <DashboardTab initialStats={initialStats} initialOrders={initialOrders} />
        </Tabs.Content>
        <Tabs.Content value="ingredients">
          <IngredientsTab initialData={initialIngredients} />
        </Tabs.Content>
        <Tabs.Content value="recipes">
          <RecipesTab initialRecipes={initialRecipes} initialIngredients={initialIngredients} />
        </Tabs.Content>
        <Tabs.Content value="clients">
          <ClientsTab initialData={initialClients} />
        </Tabs.Content>
        <Tabs.Content value="orders">
          <OrdersTab
            initialOrders={initialOrders}
            initialClients={initialClients}
            initialRecipes={initialRecipes}
          />
        </Tabs.Content>
        <Tabs.Content value="accounting">
          <AccountingTab
            initialOrders={initialOrders}
            initialOverheads={initialOverheads}
            initialStats={initialStats}
          />
        </Tabs.Content>
        <Tabs.Content value="simulators">
          <SimulatorsTab
            initialRecipes={initialRecipes}
            initialOverheads={initialOverheads}
            initialOrders={initialOrders}
            initialStats={initialStats}
          />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
