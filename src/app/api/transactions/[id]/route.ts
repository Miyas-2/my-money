// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Skema Zod untuk validasi parameter query (opsional, tapi baik untuk kejelasan)
const getTransactionsQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional().refine(val => !val || !isNaN(parseInt(val)), { message: "categoryId harus angka" }),
  type: z.nativeEnum(TransactionType).optional(),
  startDate: z.string().datetime({ message: "Format startDate tidak valid (ISO 8601)" }).optional(),
  endDate: z.string().datetime({ message: "Format endDate tidak valid (ISO 8601)" }).optional(),
  month: z.string().optional().refine(val => !val || (parseInt(val) >= 1 && parseInt(val) <= 12), { message: "Bulan harus antara 1-12" }),
  year: z.string().optional().refine(val => !val || (parseInt(val) >= 2000 && parseInt(val) <= 2100), { message: "Tahun tidak valid" }),
  page: z.string().optional().refine(val => !val || parseInt(val) > 0, { message: "Page harus angka positif" }).default("1"),
  limit: z.string().optional().refine(val => !val || parseInt(val) > 0, { message: "Limit harus angka positif" }).default("10"),
});

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
        userId: userId, // 3. Gunakan userId dari sesi
      },
      include: {
        category: { select: { name: true, type: true }}
      }
    });

    if (!transaction) {
      return NextResponse.json({ message: 'Transaksi tidak ditemukan atau bukan milik Anda' }, { status: 404 });
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

    // 3. Cek transaksi milik user menggunakan userId dari sesi
    const existingTransaction = await prisma.transaction.findFirst({
        where: { id: transactionId, userId: userId }
    });

    if (!existingTransaction) {
        return NextResponse.json({ message: 'Transaksi tidak ditemukan atau Anda tidak berhak mengubahnya.' }, { status: 404 });
    }

    let categoryTypeCheck = type;
    if (categoryId) {
        const category = await prisma.category.findFirst({
            // Pastikan kategori yang dipilih juga milik user yang sedang login
            where: { id: categoryId, userId: userId }
        });
        if (!category) {
            return NextResponse.json({ message: 'Kategori baru tidak ditemukan atau tidak valid untuk pengguna ini.' }, { status: 400 });
        }
        categoryTypeCheck = type || category.type;
        if (type && category.type !== type) {
             return NextResponse.json({ message: `Tipe transaksi (${type}) tidak sesuai dengan tipe kategori baru (${category.type}).` }, { status: 400 });
        }
    } else if (type && !categoryId) {
        const oldCategory = await prisma.category.findUnique({
            where: {id: existingTransaction.categoryId }
            // Tidak perlu cek userId di sini karena existingTransaction sudah dipastikan milik user
        });
        if (oldCategory && oldCategory.type !== type) {
            return NextResponse.json({ message: `Tipe transaksi (${type}) tidak sesuai dengan tipe kategori lama (${oldCategory.type}).` }, { status: 400 });
        }
    }

    const updatedTransaction = await prisma.transaction.update({
      where: {
        id: transactionId,
        // userId: userId, // Opsi 1: Tambahkan userId di sini untuk keamanan ganda (redundant jika existingTransaction sudah dicek)
                         // Opsi 2: Hapus karena existingTransaction sudah memastikan kepemilikan
      },
      // Pastikan bahwa data yang diupdate tidak secara implisit mengubah kepemilikan
      // (misalnya, tidak ada field userId yang bisa diupdate dari body request)
      data: {
        ...(categoryId && { categoryId }),
        ...(amount && { amount }),
        ...(categoryTypeCheck && { type: categoryTypeCheck }),
        ...(description !== undefined && { description }),
        ...(date && { date: new Date(date) }),
      },
    });
    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
     if ((error as any).code === 'P2025') { // Error Prisma: Record to update not found.
        return NextResponse.json({ message: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal memperbarui transaksi', error: (error as Error).message }, { status: 500 });
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

  const transactionId = parseInt(params.id, 10);
  if (isNaN(transactionId)) {
    return NextResponse.json({ message: 'ID transaksi tidak valid' }, { status: 400 });
  }

  try {
    // 3. Cek transaksi milik user menggunakan userId dari sesi
    const transactionToDelete = await prisma.transaction.findFirst({
        where: { id: transactionId, userId: userId }
    });

    if (!transactionToDelete) {
        return NextResponse.json({ message: 'Transaksi tidak ditemukan atau Anda tidak berhak menghapusnya.' }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
        // userId: userId, // Sama seperti di PUT, ini bisa redundant jika transactionToDelete sudah dicek
      },
    });
    return NextResponse.json({ message: 'Transaksi berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    if ((error as any).code === 'P2025') { // Error Prisma: Record to delete not found.
        return NextResponse.json({ message: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus transaksi', error: (error as Error).message }, { status: 500 });
  }
}