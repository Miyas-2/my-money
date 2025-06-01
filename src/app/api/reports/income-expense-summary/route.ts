// src/app/api/reports/income-expense-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { TransactionType, CategoryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library'; // Untuk tipe Decimal dari Prisma

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  if (isNaN(userId)) {
    return NextResponse.json({ message: 'ID pengguna tidak valid dalam sesi' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month'); // (1-12)
  const yearParam = searchParams.get('year');

  if (!monthParam || !yearParam) {
    return NextResponse.json({ message: 'Parameter bulan dan tahun diperlukan' }, { status: 400 });
  }

  const month = parseInt(monthParam);
  const year = parseInt(yearParam);

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return NextResponse.json({ message: 'Parameter bulan atau tahun tidak valid' }, { status: 400 });
  }

  try {
    // Tentukan rentang tanggal untuk bulan yang dipilih
    const startDate = new Date(year, month - 1, 1); // Bulan di JS adalah 0-11
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0); // Trik untuk mendapatkan hari terakhir di bulan sebelumnya
    endDate.setHours(23, 59, 59, 999);

    // Ambil semua transaksi untuk rentang tanggal dan user tersebut
    const transactionsInPeriod = await prisma.transaction.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    let totalIncome = new Decimal(0);
    let totalExpenses = new Decimal(0);
    const expensesByCategoryMap = new Map<number, { categoryId: number; categoryName: string; total: Decimal }>();

    transactionsInPeriod.forEach(tx => {
      if (tx.type === TransactionType.Pemasukan) {
        totalIncome = totalIncome.plus(tx.amount);
      } else if (tx.type === TransactionType.Pengeluaran) {
        totalExpenses = totalExpenses.plus(tx.amount);
        if (tx.category) {
          const existingCategoryExpense = expensesByCategoryMap.get(tx.categoryId);
          if (existingCategoryExpense) {
            existingCategoryExpense.total = existingCategoryExpense.total.plus(tx.amount);
          } else {
            expensesByCategoryMap.set(tx.categoryId, {
              categoryId: tx.categoryId,
              categoryName: tx.category.name,
              total: tx.amount,
            });
          }
        }
      }
    });

    const netAmount = totalIncome.minus(totalExpenses);
    const expensesByCategory = Array.from(expensesByCategoryMap.values()).map(item => ({
        ...item,
        total: item.total.toNumber(), // Konversi Decimal ke number untuk response
    })).sort((a,b) => b.total - a.total); // Urutkan dari pengeluaran terbesar

    return NextResponse.json({
      month: month,
      year: year,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalIncome: totalIncome.toNumber(), // Konversi Decimal ke number
      totalExpenses: totalExpenses.toNumber(), // Konversi Decimal ke number
      netAmount: netAmount.toNumber(), // Konversi Decimal ke number
      expensesByCategory,
      transactionCount: transactionsInPeriod.length,
    });

  } catch (error) {
    console.error("Error fetching income-expense report:", error);
    return NextResponse.json({ message: 'Gagal mengambil data laporan', error: (error as Error).message }, { status: 500 });
  }
}