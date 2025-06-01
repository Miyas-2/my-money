// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
// import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma, TransactionType } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const createTransactionSchema = z.object({
  categoryId: z.number().int().positive("ID Kategori tidak valid"),
  amount: z.number().positive("Jumlah harus positif"),
  type: z.nativeEnum(TransactionType),
  description: z.string().max(255).optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Format tanggal tidak valid",
  }),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  if (isNaN(userId)) {
    return NextResponse.json({ message: "ID pengguna tidak valid dalam sesi" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');
  const categoryIdParam = searchParams.get('categoryId');
  const typeParam = searchParams.get('type') as TransactionType | null;
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  const whereClause: Prisma.TransactionWhereInput = {
    userId: userId,
  };

  if (searchTerm) {
    whereClause.description = {
      contains: searchTerm,
      // mode: 'insensitive', // <-- HAPUS BARIS INI
    };
  }

  if (categoryIdParam) {
    const parsedCategoryId = parseInt(categoryIdParam);
    if (!isNaN(parsedCategoryId)) {
      whereClause.categoryId = parsedCategoryId;
    }
  }

  if (typeParam && Object.values(TransactionType).includes(typeParam)) {
    whereClause.type = typeParam;
  }

  const dateFilter: Prisma.DateTimeFilter = {};
  if (startDateParam) {
    const date = new Date(startDateParam);
    if (!isNaN(date.valueOf())) {
        date.setHours(0, 0, 0, 0);
        dateFilter.gte = date;
    }
  }
  if (endDateParam) {
    const date = new Date(endDateParam);
    if (!isNaN(date.valueOf())) {
        date.setHours(23, 59, 59, 999);
        dateFilter.lte = date;
    }
  }
  if (Object.keys(dateFilter).length > 0) {
    whereClause.date = dateFilter;
  }

  if (monthParam && yearParam && !startDateParam && !endDateParam) {
    const month = parseInt(monthParam);
    const year = parseInt(yearParam);
    if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      };
    }
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: {
          select: { name: true, type: true }
        }
      },
      orderBy: {
        date: 'desc',
      },
      // skip: skip,
      // take: limit,
    });

    const plainTransactions = transactions.map(tx => ({
      ...tx,
      amount: tx.amount.toNumber(),
    }));

    return NextResponse.json({
      transactions: plainTransactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ message: 'Gagal mengambil data transaksi', error: (error as Error).message }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }
  const userId = parseInt(session.user.id); // Asumsikan userId di Prisma adalah Integer

  if (isNaN(userId)) {
    return NextResponse.json({ message: "ID pengguna tidak valid dalam sesi" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = createTransactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { categoryId, amount, type, description, date } = validation.data;

    // Pastikan kategori milik user yang bersangkutan
    const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: userId }
    });

    if (!category) {
        return NextResponse.json({ message: 'Kategori tidak ditemukan atau tidak valid untuk pengguna ini.' }, { status: 400 });
    }

    // Pastikan tipe transaksi sesuai dengan tipe kategori (opsional, tapi baik untuk konsistensi)
    if (category.type !== type) {
        return NextResponse.json({ message: `Tipe transaksi (${type}) tidak sesuai dengan tipe kategori (${category.type}).` }, { status: 400 });
    }

    const newTransaction = await prisma.transaction.create({
      data: {
        userId: userId,
        categoryId,
        amount,
        type,
        description,
        date: new Date(date),
      },
    });
    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ message: 'Gagal membuat transaksi', error: (error as Error).message }, { status: 500 });
  }
}