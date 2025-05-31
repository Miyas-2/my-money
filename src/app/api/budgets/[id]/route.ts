// src/app/api/budgets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { z } from 'zod';

const updateBudgetSchema = z.object({
  // Kategori, bulan, dan tahun biasanya tidak diubah untuk budget yang sudah ada.
  // Lebih umum untuk menghapus dan membuat baru jika ingin mengubah parameter tersebut.
  // Jadi, kita hanya izinkan update amount.
  amount: z.number().positive().optional(),
  // categoryId: z.number().int().positive().optional(),
  // month: z.number().int().min(1).max(12).optional(),
  // year: z.number().int().min(2000).max(2100).optional(),
});

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const sessionUserId = 1; // GANTI DENGAN LOGIC AUTENTIKASI
  const budgetId = parseInt(params.id, 10);

  if (isNaN(budgetId)) {
    return NextResponse.json({ message: 'ID anggaran tidak valid' }, { status: 400 });
  }

  try {
    const budget = await prisma.budget.findUnique({
      where: {
        id: budgetId,
        userId: sessionUserId,
      },
      include: {
        category: { select: { name: true, type: true }}
      }
    });

    if (!budget) {
      return NextResponse.json({ message: 'Anggaran tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json({ message: 'Gagal mengambil data anggaran', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const sessionUserId = 1; // GANTI DENGAN LOGIC AUTENTIKASI
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

    const { amount /*, categoryId, month, year*/ } = validation.data;

    // Cek budget milik user
    const existingBudget = await prisma.budget.findFirst({
        where: { id: budgetId, userId: sessionUserId }
    });

    if (!existingBudget) {
        return NextResponse.json({ message: 'Anggaran tidak ditemukan atau Anda tidak berhak mengubahnya.' }, { status: 404 });
    }

    // Jika ingin mengizinkan perubahan categoryId, month, year, perlu validasi duplikasi @@unique
    // if (categoryId || month || year) {
    //   const newCategoryId = categoryId || existingBudget.categoryId;
    //   const newMonth = month || existingBudget.month;
    //   const newYear = year || existingBudget.year;
    //   if (!(newCategoryId === existingBudget.categoryId && newMonth === existingBudget.month && newYear === existingBudget.year)) {
    //       const duplicateBudget = await prisma.budget.findUnique({
    //           where: {
    //               userId_categoryId_month_year: {
    //                   userId: sessionUserId,
    //                   categoryId: newCategoryId,
    //                   month: newMonth,
    //                   year: newYear,
    //               }
    //           }
    //       });
    //       if (duplicateBudget && duplicateBudget.id !== budgetId) {
    //           return NextResponse.json({ message: `Anggaran untuk kategori dan periode tersebut sudah ada.`}, { status: 409 });
    //       }
    //   }
    // }


    const updatedBudget = await prisma.budget.update({
      where: {
        id: budgetId,
        // userId: sessionUserId, // Sudah dicek
      },
      data: {
        ...(amount && { amount }),
        // ...(categoryId && { categoryId }),
        // ...(month && { month }),
        // ...(year && { year }),
      },
    });
    return NextResponse.json(updatedBudget);
  } catch (error) {
    console.error("Error updating budget:", error);
    if ((error as any).code === 'P2025') {
        return NextResponse.json({ message: 'Anggaran tidak ditemukan.' }, { status: 404 });
    }
    // if ((error as any).code === 'P2002') { // Jika validasi duplikasi untuk categoryId, month, year diaktifkan
    //     return NextResponse.json({ message: `Anggaran untuk kategori dan periode tersebut sudah ada.` }, { status: 409 });
    // }
    return NextResponse.json({ message: 'Gagal memperbarui anggaran', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const sessionUserId = 1; // GANTI DENGAN LOGIC AUTENTIKASI
  const budgetId = parseInt(params.id, 10);

  if (isNaN(budgetId)) {
    return NextResponse.json({ message: 'ID anggaran tidak valid' }, { status: 400 });
  }

  try {
    // Cek budget milik user
    const budgetToDelete = await prisma.budget.findFirst({
        where: { id: budgetId, userId: sessionUserId }
    });

    if (!budgetToDelete) {
        return NextResponse.json({ message: 'Anggaran tidak ditemukan atau Anda tidak berhak menghapusnya.' }, { status: 404 });
    }

    await prisma.budget.delete({
      where: {
        id: budgetId,
        // userId: sessionUserId, // Sudah dicek
      },
    });
    return NextResponse.json({ message: 'Anggaran berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error("Error deleting budget:", error);
     if ((error as any).code === 'P2025') {
        return NextResponse.json({ message: 'Anggaran tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus anggaran', error: (error as Error).message }, { status: 500 });
  }
}