// src/app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma'; // Pastikan path ini benar
import { z } from 'zod';
import { CategoryType } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori tidak boleh kosong").max(100).optional(),
  type: z.nativeEnum(CategoryType).optional(),
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

  const categoryId = parseInt(params.id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ message: 'ID kategori tidak valid' }, { status: 400 });
  }

  try {
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
        userId: userId, // 3. Pastikan kategori milik user yang sedang login
      },
    });

    if (!category) {
      return NextResponse.json({ message: 'Kategori tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json({ message: 'Gagal mengambil data kategori', error: (error as Error).message }, { status: 500 });
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

  const categoryId = parseInt(params.id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ message: 'ID kategori tidak valid' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Data tidak valid", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, type } = validation.data;

    // 3. Cek apakah kategori milik user menggunakan userId dari sesi
    const existingCategory = await prisma.category.findFirst({
        where: { id: categoryId, userId: userId }
    });

    if (!existingCategory) {
        return NextResponse.json({ message: 'Kategori tidak ditemukan atau Anda tidak berhak mengubahnya.' }, { status: 404 });
    }

    if (name && name !== existingCategory.name) {
        const duplicateNameCategory = await prisma.category.findUnique({
            where: {
                userId_name: {
                    userId: userId, // Gunakan userId dari sesi
                    name: name,
                }
            }
        });
        if (duplicateNameCategory) {
            return NextResponse.json({ message: `Kategori dengan nama "${name}" sudah ada untuk pengguna ini.` }, { status: 409 });
        }
    }

    const updatedCategory = await prisma.category.update({
      where: {
        id: categoryId, // Kepemilikan sudah dicek dengan existingCategory
      },
      data: {
        ...(name && { name }),
        ...(type && { type }),
      },
    });
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    if ((error as any).code === 'P2002') { // Unique constraint violation
        return NextResponse.json({ message: `Kategori dengan nama tersebut sudah ada.` }, { status: 409 });
    }
    if ((error as any).code === 'P2025') { // Record to update not found
        return NextResponse.json({ message: 'Kategori tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal memperbarui kategori', error: (error as Error).message }, { status: 500 });
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

  const categoryId = parseInt(params.id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ message: 'ID kategori tidak valid' }, { status: 400 });
  }

  try {
    // 3. Cek apakah kategori milik user menggunakan userId dari sesi
    const categoryToDelete = await prisma.category.findFirst({
        where: { id: categoryId, userId: userId }
    });

    if (!categoryToDelete) {
        return NextResponse.json({ message: 'Kategori tidak ditemukan atau Anda tidak berhak menghapusnya.' }, { status: 404 });
    }

    const relatedTransactionsCount = await prisma.transaction.count({ where: { categoryId } });
    const relatedBudgetsCount = await prisma.budget.count({ where: { categoryId }});

    if (relatedTransactionsCount > 0 || relatedBudgetsCount > 0) {
        return NextResponse.json({
            message: 'Kategori tidak dapat dihapus karena masih terkait dengan transaksi atau anggaran. Hapus dulu keterkaitannya.',
        }, { status: 400 });
    }

    await prisma.category.delete({
      where: {
        id: categoryId, // Kepemilikan sudah dicek dengan categoryToDelete
      },
    });
    return NextResponse.json({ message: 'Kategori berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error("Error deleting category:", error);
    if ((error as any).code === 'P2025') { // Record to delete not found
        return NextResponse.json({ message: 'Kategori tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus kategori', error: (error as Error).message }, { status: 500 });
  }
}