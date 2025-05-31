// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma'; // Pastikan path ini benar

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const userId = parseInt(params.id, 10);

  if (isNaN(userId)) {
    return NextResponse.json({ message: 'ID pengguna tidak valid' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: { // Selalu seleksi field yang akan dikembalikan
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // Relasi lain jika diperlukan, contoh:
        // _count: { // Menghitung jumlah relasi
        //   select: { transactions: true, categories: true, budgets: true }
        // }
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: 'Gagal mengambil data pengguna', error: (error as Error).message }, { status: 500 });
  }
}

// Endpoint PUT dan DELETE untuk user juga memerlukan pertimbangan autentikasi
// dan otorisasi yang kuat (misalnya, hanya admin atau user itu sendiri yang bisa update/delete).
// Akan lebih baik ditangani setelah sistem autentikasi terpasang.