"use client";

import { useState } from "react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Client } from "@/types";
import { Plus, Pencil, Trash2, Phone, MapPin, User } from "lucide-react";

interface Props { initialData: Client[] }

export function ClientsTab({ initialData }: Props) {
  const { data: clients } = useClients(initialData);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Clients ({clients?.length ?? 0})</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nouveau client
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clients?.map((client) => (
          <div key={client.id} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <p className="font-medium">{client.name}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(client)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteClient.mutate(client.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {client.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" /> {client.phone}
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" /> {client.address}
              </div>
            )}
            {client.notes && (
              <p className="text-xs text-muted-foreground italic">{client.notes}</p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
          <ClientForm
            onSubmit={(data) => createClient.mutate(data, { onSuccess: () => setShowCreate(false) })}
            loading={createClient.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier — {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <ClientForm
              defaultValues={editing}
              onSubmit={(data) =>
                updateClient.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })
              }
              loading={updateClient.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<Client>;
  onSubmit: (data: { name: string; phone?: string; address?: string; notes?: string }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, phone: phone || undefined, address: address || undefined, notes: notes || undefined });
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label>Nom *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Téléphone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9..." />
      </div>
      <div className="space-y-1">
        <Label>Adresse</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading || !name}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
