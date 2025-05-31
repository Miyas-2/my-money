// src/app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma'; // Pastikan path ini benar
import { z } from 'zod';
import { CategoryType } from '@prisma/client';

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
  // --- simulasi mendapatkan userId dari sesi autentikasi ---
  const sessionUserId = 1; // GANTI INI DENGAN LOGIC AUTENTIKASI SEBENARNYA
  // ----------------------------------------------------
  const categoryId = parseInt(params.id, 10);

  if (isNaN(categoryId)) {
    return NextResponse.json({ message: 'ID kategori tidak valid' }, { status: 400 });
  }

  try {
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
        userId: sessionUserId, // Pastikan user hanya bisa akses kategori miliknya
      },
    });

    if (!category) {
      return NextResponse.json({ message: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json({ message: 'Gagal mengambil data kategori', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  // --- simulasi mendapatkan userId dari sesi autentikasi ---
  const sessionUserId = 1; // GANTI INI DENGAN LOGIC AUTENTIKASI SEBENARNYA
  // ----------------------------------------------------
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

    // Cek apakah kategori milik user
    const existingCategory = await prisma.category.findFirst({
        where: { id: categoryId, userId: sessionUserId }
    });

    if (!existingCategory) {
        return NextResponse.json({ message: 'Kategori tidak ditemukan atau Anda tidak berhak mengubahnya.' }, { status: 404 });
    }

    // Jika nama diubah, cek duplikasi nama untuk user yang sama (kecuali untuk kategori yang sedang diupdate)
    if (name && name !== existingCategory.name) {
        const duplicateNameCategory = await prisma.category.findUnique({
            where: {
                userId_name: {
                    userId: sessionUserId,
                    name: name,
                }
            }
        });
        if (duplicateNameCategory) {
            return NextResponse.json({ message: `Kategori dengan nama "${name}" sudah ada.` }, { status: 409 });
        }
    }

    const updatedCategory = await prisma.category.update({
      where: {
        id: categoryId,
        // userId: sessionUserId, // Sebenarnya sudah dicek di atas, tapi bisa ditambahkan untuk keamanan ganda
      },
      data: {
        ...(name && { name }), // Hanya update jika ada di payload
        ...(type && { type }),
      },
    });
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    if ((error as any).code === 'P2002') {
        return NextResponse.json({ message: `Kategori dengan nama tersebut sudah ada.` }, { status: 409 });
    }
    if ((error as any).code === 'P2025') { // Record to update not found
        return NextResponse.json({ message: 'Kategori tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal memperbarui kategori', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  // --- simulasi mendapatkan userId dari sesi autentikasi ---
  const sessionUserId = 1; // GANTI INI DENGAN LOGIC AUTENTIKASI SEBENARNYA
  // ----------------------------------------------------
  const categoryId = parseInt(params.id, 10);

  if (isNaN(categoryId)) {
    return NextResponse.json({ message: 'ID kategori tidak valid' }, { status: 400 });
  }

  try {
    // Cek apakah kategori milik user
    const categoryToDelete = await prisma.category.findFirst({
        where: { id: categoryId, userId: sessionUserId }
    });

    if (!categoryToDelete) {
        return NextResponse.json({ message: 'Kategori tidak ditemukan atau Anda tidak berhak menghapusnya.' }, { status: 404 });
    }

    // Tambahan: Cek apakah kategori ini digunakan di transaksi atau budget
    // Jika iya, mungkin Anda tidak ingin langsung menghapus, atau memberikan pesan khusus.
    // Untuk contoh ini, kita langsung hapus.
    const relatedTransactionsCount = await prisma.transaction.count({ where: { categoryId } });
    const relatedBudgetsCount = await prisma.budget.count({ where: { categoryId }});

    if (relatedTransactionsCount > 0 || relatedBudgetsCount > 0) {
        return NextResponse.json({
            message: 'Kategori tidak dapat dihapus karena masih terkait dengan transaksi atau anggaran. Hapus dulu keterkaitannya.',
        }, { status: 400 }); // Bad Request atau 409 Conflict
    }


    await prisma.category.delete({
      where: {
        id: categoryId,
        // userId: sessionUserId, // Sudah dicek di atas
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