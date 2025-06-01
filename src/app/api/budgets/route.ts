// src/app/api/budgets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { z } from 'zod';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const createBudgetSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(new Date().getFullYear() - 10).max(new Date().getFullYear() + 10),
});

export async function GET(request: NextRequest) {
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

  try {
    const budgets = await prisma.budget.findMany({
      where: {
        userId: userId, // 3. Gunakan userId dari sesi
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

  try {
    const body = await request.json();
    const validation = createBudgetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { categoryId, amount, month, year } = validation.data;

    // 3. Pastikan kategori milik user yang bersangkutan menggunakan userId dari sesi
    const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: userId, type: 'Pengeluaran' }
    });

    if (!category) {
        return NextResponse.json({ message: 'Kategori pengeluaran tidak ditemukan atau tidak valid untuk pengguna ini.' }, { status: 400 });
    }

    // 4. Cek duplikasi budget menggunakan userId dari sesi
    const existingBudget = await prisma.budget.findUnique({
        where: {
            userId_categoryId_month_year: {
                userId: userId,
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
        userId: userId, // 5. Gunakan userId dari sesi
        categoryId,
        amount,
        month,
        year,
      },
    });
    return NextResponse.json(newBudget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    if ((error as any).code === 'P2002') { // Unique constraint violation
        return NextResponse.json({ message: `Anggaran untuk kategori dan periode tersebut sudah ada.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Gagal membuat anggaran', error: (error as Error).message }, { status: 500 });
  }
}