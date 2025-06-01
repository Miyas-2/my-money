// src/app/(app)/budgets/components/BudgetForm.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { Budget, Category, CategoryType } from '@prisma/client';
import { X, Loader2 } from 'lucide-react';

interface BudgetFormProps {
  initialData?: Budget| null; // Untuk mode edit
  expenseCategories: Category[]; // Daftar kategori PENGELUARAN milik user
  onSuccess: () => void;
  onCancel: () => void;
}

// Helper untuk mendapatkan daftar bulan dan tahun
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i); // 5 tahun ke belakang, 4 tahun ke depan
const months = [
  { value: 1, name: 'Januari' }, { value: 2, name: 'Februari' }, { value: 3, name: 'Maret' },
  { value: 4, name: 'April' }, { value: 5, name: 'Mei' }, { value: 6, name: 'Juni' },
  { value: 7, name: 'Juli' }, { value: 8, name: 'Agustus' }, { value: 9, name: 'September' },
  { value: 10, name: 'Oktober' }, { value: 11, name: 'November' }, { value: 12, name: 'Desember' },
];

export default function BudgetForm({
  initialData,
  expenseCategories,
  onSuccess,
  onCancel,
}: BudgetFormProps) {
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<number | string>('');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // Bulan saat ini (1-12)
  const [year, setYear] = useState<number>(currentYear);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.categoryId.toString());
      setAmount(initialData.amount.toString()); // Amount dari Prisma adalah Decimal
      setMonth(initialData.month);
      setYear(initialData.year);
    } else {
      // Reset form untuk mode tambah
      setCategoryId(expenseCategories.length > 0 ? expenseCategories[0].id.toString() : '');
      setAmount('');
      setMonth(new Date().getMonth() + 1);
      setYear(currentYear);
    }
  }, [initialData, expenseCategories]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!categoryId && !isEditMode) { // categoryId hanya wajib untuk mode tambah
      setError("Silakan pilih kategori.");
      setIsLoading(false);
      return;
    }

    const numericAmount = parseFloat(amount as string);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Jumlah anggaran harus angka positif.");
      setIsLoading(false);
      return;
    }

    const payload = isEditMode
      ? { amount: numericAmount } // Hanya amount yang diupdate saat edit
      : {
          categoryId: parseInt(categoryId),
          amount: numericAmount,
          month: month,
          year: year,
        };

    const apiUrl = isEditMode ? `/api/budgets/${initialData?.id}` : '/api/budgets';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.errors?.[Object.keys(data.errors)[0]]?.[0] || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} anggaran.`);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error("Budget form error:", err);
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
          {isEditMode ? 'Edit Anggaran' : 'Tambah Anggaran Baru'}
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
            Kategori (Pengeluaran)
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required={!isEditMode}
            disabled={isEditMode || expenseCategories.length === 0} 
            
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 disabled:bg-gray-50 text-black"
          >
            <option value="">Pilih Kategori</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </option>
            ))}
          </select>
          {expenseCategories.length === 0 && !isEditMode && (
            <p className="text-xs text-gray-500 mt-1">
              Tidak ada kategori 'Pengeluaran' yang tersedia
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Bulan
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              required
              disabled={isEditMode}
              className="w-full px-3 text-black py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 disabled:bg-gray-50"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Tahun
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              required
              disabled={isEditMode}
              
              className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 disabled:bg-gray-50"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Jumlah Anggaran (Rp)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="1000000"
            className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
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
            disabled={isLoading || (isEditMode && !amount)}
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
              'Tambah Anggaran'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}