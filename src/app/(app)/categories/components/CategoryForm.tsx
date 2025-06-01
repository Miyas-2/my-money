// src/app/(app)/categories/components/CategoryForm.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Category, CategoryType } from '@prisma/client'; // Impor tipe dari Prisma
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';

interface CategoryFormProps {
  initialData?: Category | null; // Untuk mode edit, null atau undefined untuk mode tambah
  onSuccess: () => void; // Callback setelah berhasil submit
  onCancel: () => void; // Callback untuk membatalkan/menutup form
}

export default function CategoryForm({ initialData, onSuccess, onCancel }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>(CategoryType.Pengeluaran); // Default ke Pengeluaran
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
    } else {
      // Reset form untuk mode tambah
      setName('');
      setType(CategoryType.Pengeluaran);
    }
  }, [initialData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Nama kategori tidak boleh kosong.");
      setIsLoading(false);
      return;
    }

    const payload = { name, type };
    const apiUrl = isEditMode ? `/api/categories/${initialData?.id}` : '/api/categories';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

       if (!response.ok) {
        setInlineError(data.message || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} kategori.`);
        toast.error(data.message || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} kategori.`); // Tampilkan juga toast error
      } else {
        toast.success(`Kategori berhasil ${isEditMode ? 'diperbarui' : 'dibuat'}!`);
        onSuccess();
      }
    } catch (err) {
      console.error("Category form error:", err);
      const errorMessage = "Terjadi kesalahan pada server.";
      setInlineError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {isEditMode ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        </h2>
        <button 
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Nama Kategori
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Tipe Kategori
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CategoryType)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
          >
            <option value={CategoryType.Pengeluaran}>Pengeluaran</option>
            <option value={CategoryType.Pemasukan}>Pemasukan</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : isEditMode ? (
              'Simpan Perubahan'
            ) : (
              'Tambah Kategori'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}

function setInlineError(arg0: any) {
  throw new Error('Function not implemented.');
}
