// src/app/(app)/categories/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Category, CategoryType } from '@prisma/client';
import CategoryForm from './components/CategoryForm';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from '@/components/modals/ConfirmationModal'; // Pastikan path ini benar
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null); // Ganti nama state error

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // State untuk modal konfirmasi delete
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Loading state untuk proses delete

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setPageError(null); // Reset pageError
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengambil data kategori');
      }
      const data: Category[] = await response.json();
      setCategories(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setPageError(errorMessage);
      toast.error(errorMessage || 'Gagal memuat kategori.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  // Modifikasi: Fungsi ini sekarang hanya membuka modal konfirmasi
  const handleDeleteCategoryClick = (categoryId: number) => {
    setItemToDeleteId(categoryId);
    setIsConfirmModalOpen(true);
  };

  // Fungsi baru untuk menjalankan penghapusan setelah konfirmasi
  const executeDeleteCategory = async () => {
    if (itemToDeleteId === null) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories/${itemToDeleteId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || 'Gagal menghapus kategori.');
      } else {
        toast.success('Kategori berhasil dihapus.');
        fetchCategories(); // Muat ulang daftar kategori
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menghapus kategori.');
      console.error("Delete category error:", err);
    } finally {
      setIsConfirmModalOpen(false); // Tutup modal
      setItemToDeleteId(null);
      setIsDeleting(false); // Reset loading state
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  if (isLoading && categories.length === 0) return <p className="text-center text-gray-500 mt-8">Memuat kategori...</p>;
  // Tampilkan error jika ada, di luar kondisi loading spesifik (misal error fetch awal)
  if (pageError && categories.length === 0 && !isLoading) return <p className="text-center text-red-500 mt-8 bg-red-100 p-3 rounded-md">Error: {pageError}</p>;


  return (
 <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Kategori</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola kategori pemasukan dan pengeluaran</p>
        </div>
        <button
          onClick={handleAddCategory}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Kategori
        </button>
      </div>

      {/* Empty State */}
      {categories.length === 0 && !isLoading && !pageError && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl text-center">
          <p className="text-gray-500 mb-4">Belum ada kategori yang ditambahkan</p>
          <button
            onClick={handleAddCategory}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            Tambah Kategori Pertama
          </button>
        </div>
      )}

      {/* Categories Table */}
      {categories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Kategori
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.type === CategoryType.Pemasukan
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {category.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategoryClick(category.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                          title="Hapus"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showForm && (
        <CategoryForm
          initialData={editingCategory}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Konfirmasi Penghapusan Kategori"
        message={`Apakah Anda yakin ingin menghapus kategori "${
          categories.find(cat => cat.id === itemToDeleteId)?.name || 'ini'
        }"?`}
        onConfirm={executeDeleteCategory}
        onCancel={() => setIsConfirmModalOpen(false)}
        confirmButtonText="Ya, Hapus"
        isConfirming={isDeleting}
      />
    </div>
  );
}