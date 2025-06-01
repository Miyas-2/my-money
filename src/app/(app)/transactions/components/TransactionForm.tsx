// src/app/(app)/transactions/components/TransactionForm.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Transaction, Category, CategoryType, TransactionType } from '@prisma/client';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { X, Loader2 } from 'lucide-react';

// Definisikan tipe untuk initialData yang lebih sesuai dengan data "polos"
// Ini bisa sama dengan DisplayTransaction dari TransactionsPage.tsx
interface PlainTransactionData {
  id: number;
  description: string | null;
  amount: number; // Sudah number
  date: string;   // Sudah string (YYYY-MM-DD atau ISO string yang bisa di-parse)
  type: TransactionType;
  categoryId: number;
  // Anda tidak perlu menyertakan objek 'category' di sini jika form hanya butuh categoryId
}

interface TransactionFormProps {
  initialData?: PlainTransactionData | null; // Menggunakan tipe data "polos"
  categories: Category[];
  onSuccess: () => void;
  onCancel: () => void;
}



export default function TransactionForm({
  initialData,
  categories,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>(''); // Bisa string saat input
  const [date, setDate] = useState(''); // Format YYYY-MM-DD
  const [categoryId, setCategoryId] = useState<string>(''); // ID kategori sebagai string
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.Pengeluaran);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = Boolean(initialData);

  // Filter kategori berdasarkan tipe transaksi yang dipilih
  const availableCategories = categories.filter(cat => cat.type === transactionType);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '');
      setAmount(initialData.amount.toString()); // Amount dari Prisma adalah Decimal, ubah ke string
      // Format tanggal untuk input type="date" (YYYY-MM-DD)
      setDate(new Date(initialData.date).toISOString().split('T')[0]);
      setTransactionType(initialData.type);
      setCategoryId(initialData.categoryId.toString());
    } else {
      // Reset form untuk mode tambah
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]); // Default ke hari ini
      setTransactionType(TransactionType.Pengeluaran);
      setCategoryId('');
    }
  }, [initialData]);

  // Reset categoryId jika tipe transaksi berubah dan kategori yang dipilih tidak lagi valid
  useEffect(() => {
    if (categoryId) {
      const selectedCategory = categories.find(cat => cat.id.toString() === categoryId);
      if (selectedCategory && selectedCategory.type !== transactionType) {
        setCategoryId(''); // Reset jika kategori tidak sesuai dengan tipe baru
      }
    }
    // Jika tidak ada kategori yang tersedia untuk tipe yang dipilih, dan categoryId masih terisi, reset.
    if (availableCategories.length > 0 && categoryId && !availableCategories.find(cat => cat.id.toString() === categoryId)) {
        setCategoryId('');
    } else if (availableCategories.length > 0 && !categoryId) {
        // Jika ada kategori yang tersedia dan categoryId kosong, set ke yang pertama
        // setCategoryId(availableCategories[0].id.toString()); // Opsional: auto-select
    }


  }, [transactionType, categories, categoryId, availableCategories]);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!categoryId) {
      setError("Silakan pilih kategori.");
      setIsLoading(false);
      return;
    }

    const numericAmount = parseFloat(amount as string);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Jumlah harus angka positif.");
      setIsLoading(false);
      return;
    }

    const selectedCategory = categories.find(cat => cat.id.toString() === categoryId);
    if (selectedCategory?.type !== transactionType) {
        setError(`Tipe transaksi tidak sesuai dengan tipe kategori (${selectedCategory?.type}). Pilih kategori yang sesuai atau ubah tipe transaksi.`);
        setIsLoading(false);
        return;
    }

    const payload = {
      description: description || null, // API mengharapkan string? atau null
      amount: numericAmount,
      date: new Date(date).toISOString(), // Kirim sebagai ISO string
      categoryId: parseInt(categoryId),
      type: transactionType,
    };

    const apiUrl = isEditMode ? `/api/transactions/${initialData?.id}` : '/api/transactions';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.errors?.[Object.keys(data.errors)[0]]?.[0] || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} transaksi.`);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error("Transaction form error:", err);
      setError("Terjadi kesalahan pada server.");
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
          {isEditMode ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
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
            Tipe Transaksi
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TransactionType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
          >
            <option value={TransactionType.Pengeluaran}>Pengeluaran</option>
            <option value={TransactionType.Pemasukan}>Pemasukan</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Kategori
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={availableCategories.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 disabled:bg-gray-50 text-black"
          >
            <option value="">Pilih Kategori</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.name}
                
              </option>
            ))}
          </select>
          {availableCategories.length === 0 && transactionType && (
            <p className="text-xs text-gray-500 mt-1">
              Tidak ada kategori '{transactionType}' yang tersedia
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Jumlah (Rp)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="50000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Tanggal
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Deskripsi (Opsional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Makan siang di kantor"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
          />
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
              'Tambah Transaksi'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}