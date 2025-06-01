// src/app/api/budgets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateBudgetSchema = z.object({
  amount: z.number().positive().optional(),
});

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  // 1. Dapatkan sesi pengguna
  const session = await getServerSession(authOptions);

  // 2. Validasi sesi dan ID pengguna
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }
  const userId = parseInt(session.user.id); // Asumsikan userId di Prisma adalah Integer

  if (isNaN(userId)) {
    return NextResponse.json({ message: "ID pengguna tidak valid dalam sesi" }, { status: 400 });
  }

  const budgetId = parseInt(params.id, 10);
  if (isNaN(budgetId)) {
    return NextResponse.json({ message: 'ID anggaran tidak valid' }, { status: 400 });
  }

  try {
    const budget = await prisma.budget.findUnique({
      where: {
        id: budgetId,
        userId: userId, // 3. Pastikan budget milik user yang sedang login
      },
      include: {
        category: { select: { name: true, type: true }}
      }
    });

    if (!budget) {
      return NextResponse.json({ message: 'Anggaran tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }
    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json({ message: 'Gagal mengambil data anggaran', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  // 1. Dapatkan sesi pengguna
  const session = await getServerSession(authOptions);

  // 2. Validasi sesi dan ID pengguna
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }
  const userId = parseInt(session.user.id); // Asumsikan userId di Prisma adalah Integer

  if (isNaN(userId)) {
    return NextResponse.json({ message: "ID pengguna tidak valid dalam sesi" }, { status: 400 });
  }

  const budgetId = parseInt(params.id, 10);
  if (isNaN(budgetId)) {
    return NextResponse.json({ message: 'ID anggaran tidak valid' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateBudgetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { amount } = validation.data;

    // 3. Cek apakah budget milik user menggunakan userId dari sesi
    const existingBudget = await prisma.budget.findFirst({
        where: { id: budgetId, userId: userId }
    });

    if (!existingBudget) {
        return NextResponse.json({ message: 'Anggaran tidak ditemukan atau Anda tidak berhak mengubahnya.' }, { status: 404 });
    }

    // Jika Anda mengaktifkan logika update categoryId, month, year, pastikan menggunakan userId dari sesi di sana juga.
    // Untuk saat ini, logika tersebut dikomentari di kode asli Anda.

    const updatedBudget = await prisma.budget.update({
      where: {
        id: budgetId, // Kepemilikan sudah dicek dengan existingBudget
      },
      data: {
        ...(amount && { amount }),
      },
    });
    return NextResponse.json(updatedBudget);
  } catch (error) {
    console.error("Error updating budget:", error);
    if ((error as any).code === 'P2025') { // Record to update not found
        return NextResponse.json({ message: 'Anggaran tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal memperbarui anggaran', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  // 1. Dapatkan sesi pengguna
  const session = await getServerSession(authOptions);

  // 2. Validasi sesi dan ID pengguna
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }
  const userId = parseInt(session.user.id); // Asumsikan userId di Prisma adalah Integer

  if (isNaN(userId)) {
    return NextResponse.json({ message: "ID pengguna tidak valid dalam sesi" }, { status: 400 });
  }

  const budgetId = parseInt(params.id, 10);
  if (isNaN(budgetId)) {
    return NextResponse.json({ message: 'ID anggaran tidak valid' }, { status: 400 });
  }

  try {
    // 3. Cek apakah budget milik user menggunakan userId dari sesi
    const budgetToDelete = await prisma.budget.findFirst({
        where: { id: budgetId, userId: userId }
    });

    if (!budgetToDelete) {
        return NextResponse.json({ message: 'Anggaran tidak ditemukan atau Anda tidak berhak menghapusnya.' }, { status: 404 });
    }

    await prisma.budget.delete({
      where: {
        id: budgetId, // Kepemilikan sudah dicek dengan budgetToDelete
      },
    });
    return NextResponse.json({ message: 'Anggaran berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error("Error deleting budget:", error);
    if ((error as any).code === 'P2025') { // Record to delete not found
        return NextResponse.json({ message: 'Anggaran tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus anggaran', error: (error as Error).message }, { status: 500 });
  }
}