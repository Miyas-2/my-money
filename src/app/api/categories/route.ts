// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma'; // Pastikan path ini benar
import { z } from 'zod';
import { CategoryType } from '@prisma/client'; // Impor enum jika diperlukan

// Skema validasi untuk membuat kategori
const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori tidak boleh kosong").max(100),
  type: z.nativeEnum(CategoryType), // Menggunakan enum dari Prisma
  // userId akan didapatkan dari sesi autentikasi nantinya
});

// Skema validasi untuk mengambil kategori (opsional, jika ada query params)
const getCategoriesSchema = z.object({
  userId: z.number().int().positive(), // Contoh jika userId dikirim manual, idealnya dari sesi
});

export async function GET(request: NextRequest) {
  // --- simulasi mendapatkan userId dari sesi autentikasi ---
  const sessionUserId = 1; // GANTI INI DENGAN LOGIC AUTENTIKASI SEBENARNYA
  // ----------------------------------------------------

  try {
    // Anda bisa menambahkan filter lain jika perlu, misalnya berdasarkan query params
    // const { searchParams } = new URL(request.url);
    // const type = searchParams.get('type');

    const categories = await prisma.category.findMany({
      where: {
        userId: sessionUserId,
        // ...(type && { type: type as CategoryType }), // Contoh filter berdasarkan tipe
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ message: 'Gagal mengambil data kategori', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // --- simulasi mendapatkan userId dari sesi autentikasi ---
  const sessionUserId = 1; // GANTI INI DENGAN LOGIC AUTENTIKASI SEBENARNYA
  // ----------------------------------------------------

  try {
    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, type } = validation.data;

    const existingCategory = await prisma.category.findUnique({
      where: {
        userId_name: { // Sesuai dengan @@unique([userId, name]) di schema.prisma
          userId: sessionUserId,
          name: name,
        }
      }
    });

    if (existingCategory) {
      return NextResponse.json({ message: `Kategori "${name}" sudah ada untuk pengguna ini.` }, { status: 409 }); // 409 Conflict
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        type,
        userId: sessionUserId,
      },
    });
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    if ((error as any).code === 'P2002') { // Kode error Prisma untuk unique constraint violation
        return NextResponse.json({ message: `Kategori dengan nama tersebut sudah ada.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Gagal membuat kategori', error: (error as Error).message }, { status: 500 });
  }
}