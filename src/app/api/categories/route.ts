// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma'; // Pastikan path ini benar
import { z } from 'zod';
import { CategoryType } from '@prisma/client'; // Impor enum jika diperlukan
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Path ini sudah ada dan benar

// Skema validasi untuk membuat kategori
// userId tidak lagi ada di schema karena akan diambil dari sesi
const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori tidak boleh kosong").max(100),
  type: z.nativeEnum(CategoryType),
});

// Skema getCategoriesSchema tidak lagi diperlukan karena userId diambil dari sesi
// const getCategoriesSchema = z.object({
//   userId: z.number().int().positive(),
// });

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
    const categories = await prisma.category.findMany({
      where: {
        userId: userId, // 3. Gunakan userId dari sesi
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
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, type } = validation.data;

    // 3. Gunakan userId dari sesi untuk cek duplikasi dan pembuatan
    const existingCategory = await prisma.category.findUnique({
      where: {
        userId_name: { // Sesuai dengan @@unique([userId, name]) di schema.prisma
          userId: userId,
          name: name,
        }
      }
    });

    if (existingCategory) {
      return NextResponse.json({ message: `Kategori "${name}" sudah ada untuk pengguna ini.` }, { status: 409 });
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        type,
        userId: userId, // Gunakan userId dari sesi
      },
    });
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    if ((error as any).code === 'P2002') {
        return NextResponse.json({ message: `Kategori dengan nama tersebut sudah ada.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Gagal membuat kategori', error: (error as Error).message }, { status: 500 });
  }
}