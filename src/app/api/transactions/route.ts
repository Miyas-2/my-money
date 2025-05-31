// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
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
  const sessionUserId = 1; // GANTI DENGAN LOGIC AUTENTIKASI
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }
  // User ID dari sesi adalah string, sedangkan di Prisma mungkin integer.
  // Pastikan tipe datanya sesuai dengan skema Prisma Anda untuk userId.
  const userId = parseInt(session.user.id); // Asumsikan userId di Prisma adalah Integer

  if (isNaN(userId)) {
    // Handle kasus jika session.user.id tidak bisa di-parse ke integer
    return NextResponse.json({ message: "ID pengguna tidak valid dalam sesi" }, { status: 400 });
  }

  try {
    // Tambahkan opsi filter & pagination jika perlu
    // const { searchParams } = new URL(request.url);
    // const page = parseInt(searchParams.get('page') || '1');
    // const limit = parseInt(searchParams.get('limit') || '10');
    // const categoryId = searchParams.get('categoryId');

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        // ...(categoryId && { categoryId: parseInt(categoryId) })
      },
      include: {
        category: { // Sertakan detail kategori
          select: { name: true, type: true }
        }
      },
      orderBy: {
        date: 'desc',
      },
      // skip: (page - 1) * limit,
      // take: limit,
    });
    // const totalTransactions = await prisma.transaction.count({ where: { userId: sessionUserId }});
    return NextResponse.json({ transactions });
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