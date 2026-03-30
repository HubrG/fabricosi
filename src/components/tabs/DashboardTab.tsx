"use client";

import { useStats, type Stats } from "@/hooks/use-stats";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatARS } from "@/lib/utils";
import { TrendingUp, TrendingDown, ShoppingBag, Clock, ChefHat, DollarSign } from "lucide-react";
import type { OrderWithRelations } from "@/types";
import { ORDER_STATUS, PAYMENT_STATUS, computeOrderTotal } from "@/types";

interface Props {
  initialStats: Stats;
  initialOrders: OrderWithRelations[];
}

export function DashboardTab({ initialStats, initialOrders }: Props) {
  const { data: stats } = useStats(initialStats);
  const { data: orders } = useOrders(initialOrders);

  const pendingOrders = orders?.filter((o) => o.status === "pending" || o.status === "preparing") ?? [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="CA encaissé"
          value={formatARS(stats?.revenue ?? 0)}
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          color="text-green-700"
        />
        <StatCard
          label="CA facturé"
          value={formatARS(stats?.invoiced ?? 0)}
          icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
          color="text-blue-700"
        />
        <StatCard
          label="À encaisser"
          value={formatARS(stats?.balance ?? 0)}
          icon={<Clock className="h-4 w-4 text-yellow-600" />}
          color="text-yellow-700"
        />
        <StatCard
          label="Coût ingrédients"
          value={formatARS(stats?.ingredientCost ?? 0)}
          icon={<ShoppingBag className="h-4 w-4 text-orange-600" />}
          color="text-orange-700"
        />
        <StatCard
          label="Frais annexes"
          value={formatARS(stats?.overheadTotal ?? 0)}
          icon={<TrendingDown className="h-4 w-4 text-red-600" />}
          color="text-red-700"
        />
        <StatCard
          label="Bénéfice net"
          value={formatARS(stats?.profit ?? 0)}
          icon={<ChefHat className="h-4 w-4 text-primary" />}
          color={(stats?.profit ?? 0) >= 0 ? "text-primary" : "text-destructive"}
          highlight
        />
      </div>

      {/* Commandes actives */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Commandes en cours ({pendingOrders.length})
        </h2>
        {pendingOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune commande en cours.</p>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function OrderCard({ order }: { order: OrderWithRelations }) {
  const total = computeOrderTotal(order);
  const balance = total - order.paidAmount;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{order.client.name}</p>
          <p className="text-xs text-muted-foreground">
            {order.items.map((i) => `${i.quantity}× ${i.recipe.name}`).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold">{formatARS(total)}</p>
            {balance > 0 && <p className="text-xs text-yellow-600">Reste: {formatARS(balance)}</p>}
          </div>
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "info" | "warning" | "success"> = {
    pending: "warning",
    preparing: "info",
    ready: "success",
    delivered: "secondary" as "success",
  };
  return (
    <Badge variant={map[status] ?? "outline"}>
      {ORDER_STATUS[status as keyof typeof ORDER_STATUS] ?? status}
    </Badge>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, "destructive" | "warning" | "success"> = {
    unpaid: "destructive",
    partial: "warning",
    paid: "success",
  };
  return (
    <Badge variant={map[status] ?? "outline"}>
      {PAYMENT_STATUS[status as keyof typeof PAYMENT_STATUS] ?? status}
    </Badge>
  );
}
