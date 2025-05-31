// src/app/api/budgets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { z } from 'zod';

const createBudgetSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(new Date().getFullYear() - 10).max(new Date().getFullYear() + 10), // Rentang 10 tahun
});

export async function GET(request: NextRequest) {
  const sessionUserId = 1; // GANTI DENGAN LOGIC AUTENTIKASI
  // const { searchParams } = new URL(request.url);
  // const month = searchParams.get('month');
  // const year = searchParams.get('year');

  try {
    const budgets = await prisma.budget.findMany({
      where: {
        userId: sessionUserId,
        // ...(month && { month: parseInt(month) }),
        // ...(year && { year: parseInt(year) }),
      },
      include: {
        category: { select: { name: true, type: true } }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json({ message: 'Gagal mengambil data anggaran', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionUserId = 1; // GANTI DENGAN LOGIC AUTENTIKASI

  try {
    const body = await request.json();
    const validation = createBudgetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { categoryId, amount, month, year } = validation.data;

     // Pastikan kategori milik user yang bersangkutan
    const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: sessionUserId, type: 'Pengeluaran' } // Anggaran biasanya untuk pengeluaran
    });

    if (!category) {
        return NextResponse.json({ message: 'Kategori pengeluaran tidak ditemukan atau tidak valid untuk pengguna ini.' }, { status: 400 });
    }

    // Cek duplikasi budget @@unique([userId, categoryId, month, year])
    const existingBudget = await prisma.budget.findUnique({
        where: {
            userId_categoryId_month_year: {
                userId: sessionUserId,
                categoryId,
                month,
                year
            }
        }
    });

    if (existingBudget) {
        return NextResponse.json({ message: `Anggaran untuk kategori ini di bulan ${month}/${year} sudah ada.` }, { status: 409 });
    }


    const newBudget = await prisma.budget.create({
      data: {
        userId: sessionUserId,
        categoryId,
        amount,
        month,
        year,
      },
    });
    return NextResponse.json(newBudget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    if ((error as any).code === 'P2002') {
        return NextResponse.json({ message: `Anggaran untuk kategori dan periode tersebut sudah ada.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Gagal membuat anggaran', error: (error as Error).message }, { status: 500 });
  }
}