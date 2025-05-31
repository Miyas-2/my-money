// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";


const updateTransactionSchema = z.object({
  categoryId: z.number().int().positive("ID Kategori tidak valid").optional(),
  amount: z.number().positive("Jumlah harus positif").optional(),
  type: z.nativeEnum(TransactionType).optional(),
  description: z.string().max(255).optional().nullable(), // Allow null to clear description
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Format tanggal tidak valid",
  }).optional(),
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

  const transactionId = parseInt(params.id, 10);
  if (isNaN(transactionId)) {
    return NextResponse.json({ message: 'ID transaksi tidak valid' }, { status: 400 });
  }


  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
        userId: userId,
      },
      include: {
        category: { select: { name: true, type: true }}
      }
    });

    if (!transaction) {
      return NextResponse.json({ message: 'Transaksi tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json({ message: 'Gagal mengambil data transaksi', error: (error as Error).message }, { status: 500 });
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

  const transactionId = parseInt(params.id, 10);
  if (isNaN(transactionId)) {
    return NextResponse.json({ message: 'ID transaksi tidak valid' }, { status: 400 });
  }


  try {
    const body = await request.json();
    const validation = updateTransactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { categoryId, amount, type, description, date } = validation.data;

    // Cek transaksi milik user
    const existingTransaction = await prisma.transaction.findFirst({
        where: { id: transactionId, userId: userId }
    });

    if (!existingTransaction) {
        return NextResponse.json({ message: 'Transaksi tidak ditemukan atau Anda tidak berhak mengubahnya.' }, { status: 404 });
    }

    let categoryTypeCheck = type;
    if (categoryId) {
        const category = await prisma.category.findFirst({
            where: { id: categoryId, userId: userId }
        });
        if (!category) {
            return NextResponse.json({ message: 'Kategori baru tidak ditemukan atau tidak valid.' }, { status: 400 });
        }
        // Jika tipe transaksi tidak dikirim, tapi kategori diubah, sesuaikan tipe transaksi dengan tipe kategori baru
        categoryTypeCheck = type || category.type;
        if (type && category.type !== type) {
             return NextResponse.json({ message: `Tipe transaksi (${type}) tidak sesuai dengan tipe kategori baru (${category.type}).` }, { status: 400 });
        }
    } else if (type && !categoryId) { // Jika hanya tipe yang diubah, pastikan sesuai dengan kategori lama
        const oldCategory = await prisma.category.findUnique({ where: {id: existingTransaction.categoryId }});
        if (oldCategory && oldCategory.type !== type) {
            return NextResponse.json({ message: `Tipe transaksi (${type}) tidak sesuai dengan tipe kategori lama (${oldCategory.type}).` }, { status: 400 });
        }
    }


    const updatedTransaction = await prisma.transaction.update({
      where: {
        id: transactionId,
        // userId: sessionUserId, // Sudah dicek
      },
      data: {
        ...(categoryId && { categoryId }),
        ...(amount && { amount }),
        ...(categoryTypeCheck && { type: categoryTypeCheck }),
        ...(description !== undefined && { description }), // Allow setting description to null
        ...(date && { date: new Date(date) }),
      },
    });
    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
     if ((error as any).code === 'P2025') {
        return NextResponse.json({ message: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal memperbarui transaksi', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const sessionUserId = 1; // GANTI DENGAN LOGIC AUTENTIKASI
  const transactionId = parseInt(params.id, 10);

  if (isNaN(transactionId)) {
    return NextResponse.json({ message: 'ID transaksi tidak valid' }, { status: 400 });
  }

  try {
    // Cek transaksi milik user
    const transactionToDelete = await prisma.transaction.findFirst({
        where: { id: transactionId, userId: sessionUserId }
    });

    if (!transactionToDelete) {
        return NextResponse.json({ message: 'Transaksi tidak ditemukan atau Anda tidak berhak menghapusnya.' }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
        // userId: sessionUserId, // Sudah dicek
      },
    });
    return NextResponse.json({ message: 'Transaksi berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    if ((error as any).code === 'P2025') {
        return NextResponse.json({ message: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus transaksi', error: (error as Error).message }, { status: 500 });
  }
}