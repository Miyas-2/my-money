// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma'; // Pastikan path ini benar

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      // Secara default, jangan sertakan field password dalam response!
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // Jangan sertakan:
        // password: true,
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: 'Gagal mengambil data pengguna', error: (error as Error).message }, { status: 500 });
  }
}

// --- PENTING ---
// Endpoint POST untuk membuat user baru memerlukan implementasi hashing password
// dan idealnya diintegrasikan dengan sistem autentikasi (misalnya NextAuth.js).
// Contoh di bawah ini HANYA placeholder dan TIDAK AMAN untuk produksi tanpa hashing.
//
// export async function POST(request: NextRequest) {
//   // JANGAN GUNAKAN INI DI PRODUKSI TANPA HASHING PASSWORD YANG BENAR
//   // DAN VALIDASI YANG LEBIH KETAT
//   try {
//     const body = await request.json();
//     // const { username, email, password } = body; // Perlu validasi ketat dan hashing password
//     // const hashedPassword = await hashPassword(password); // Fungsi hashing terpisah
//     // const newUser = await prisma.user.create({
//     //   data: { username, email, password: hashedPassword },
//     // });
//     // const { password: _, ...userWithoutPassword } = newUser; // Hapus password dari response
//     // return NextResponse.json(userWithoutPassword, { status: 201 });
//     return NextResponse.json({ message: 'Endpoint POST user belum diimplementasikan dengan aman. Gunakan sistem autentikasi.' }, { status: 501 });
//   } catch (error) {
//     // ... error handling
//     return NextResponse.json({ message: 'Gagal membuat pengguna', error: (error as Error).message }, { status: 500 });
//   }
// }