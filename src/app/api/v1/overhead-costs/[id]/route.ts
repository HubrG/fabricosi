import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().nonnegative().optional(),
  frequency: z.enum(["once", "monthly"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const cost = await prisma.overheadCost.update({ where: { id }, data: parsed.data });
  return NextResponse.json(cost);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.overheadCost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
