// src/app/(app)/budgets/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Budget, Category, CategoryType, Transaction, TransactionType } from '@prisma/client';
import BudgetForm from './components/BudgetForm';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

// Helper untuk format mata uang dan menampilkan nama bulan
const formatCurrency = (amount: number | string) => {
  const numberAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(numberAmount);
};

const getMonthName = (monthNumber: number) => {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString('id-ID', { month: 'long' });
};

// Interface untuk budget yang sudah menyertakan kategori dan data progres
interface BudgetDisplayData extends Budget {
  category: {
    name: string;
    type: CategoryType;
  } | null;
  spentAmount: number;
  progressPercentage: number;
  // Konversi amount dari Decimal ke number untuk kemudahan penggunaan di client
  budgetAmount: number;
}

// Interface untuk transaksi yang diambil dari API (amount sudah number, date sudah string)
interface FetchedTransaction {
  id: number;
  userId: number;
  categoryId: number;
  amount: number; // Pastikan ini number dari API atau konversi setelah fetch
  type: TransactionType;
  description: string | null;
  date: string; // ISO string
  // ... field lain jika ada
}


export default function BudgetsPage() {
  // State untuk data asli dari API
  const [rawBudgets, setRawBudgets] = useState<(Budget & { category: { name: string; type: CategoryType } | null })[]>([]);
  const [allTransactions, setAllTransactions] = useState<FetchedTransaction[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);

  // State untuk data yang akan ditampilkan (sudah dengan kalkulasi progres)
  const [displayBudgets, setDisplayBudgets] = useState<BudgetDisplayData[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetDisplayData | null>(null); // Gunakan BudgetDisplayData

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // State loading untuk proses delete

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/categories'),
        fetch('/api/transactions') // Ambil semua transaksi
      ]);

      // Handle Budgets
      if (!budgetsRes.ok) throw new Error((await budgetsRes.json()).message || 'Gagal mengambil data anggaran');
      const budgetsData = await budgetsRes.json();
      setRawBudgets(budgetsData || []);

      // Handle Categories
      if (!categoriesRes.ok) throw new Error((await categoriesRes.json()).message || 'Gagal mengambil data kategori');
      const allCategoriesData: Category[] = await categoriesRes.json();
      setExpenseCategories(allCategoriesData.filter(cat => cat.type === CategoryType.Pengeluaran));

      // Handle Transactions
      if (!transactionsRes.ok) throw new Error((await transactionsRes.json()).message || 'Gagal mengambil data transaksi');
      const transactionsData = await transactionsRes.json();
      // Pastikan amount pada transaksi adalah number. Jika API mengembalikan Decimal, konversi di sini.
      // Asumsi API /api/transactions sudah mengembalikan { transactions: [...] } dengan amount sebagai number.
      setAllTransactions(
        (transactionsData.transactions || []).map((tx: any) => ({
          ...tx,
          amount: typeof tx.amount === 'object' && tx.amount !== null && 'toNumber' in tx.amount
            ? tx.amount.toNumber() // Jika masih Decimal dari Prisma
            : Number(tx.amount),  // Jika sudah angka tapi mungkin string
          date: tx.date, // Asumsi sudah ISO string
        }))
      );

    } catch (err) {
      setError((err as Error).message);
      setRawBudgets([]); // Kosongkan jika error
      setAllTransactions([]);
      setExpenseCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Efek untuk menghitung progres budget ketika rawBudgets atau allTransactions berubah
  useEffect(() => {
    if (rawBudgets.length > 0 && allTransactions.length > 0) {
      const calculatedBudgets = rawBudgets.map(budget => {
        const budgetAmountNumber = typeof budget.amount === 'object' && budget.amount !== null && 'toNumber' in budget.amount
          ? (budget.amount as any).toNumber()
          : Number(budget.amount);

        const relevantTransactions = allTransactions.filter(tx =>
          tx.categoryId === budget.categoryId &&
          tx.type === TransactionType.Pengeluaran &&
          new Date(tx.date).getFullYear() === budget.year &&
          new Date(tx.date).getMonth() + 1 === budget.month // getMonth() is 0-11
        );

        const spentAmount = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const progressPercentage = budgetAmountNumber > 0 ? Math.min((spentAmount / budgetAmountNumber) * 100, 100) : 0;

        return {
          ...budget,
          budgetAmount: budgetAmountNumber, // Simpan versi number
          category: budget.category,
          spentAmount,
          progressPercentage,
        };
      });
      setDisplayBudgets(calculatedBudgets);
    } else if (rawBudgets.length > 0 && allTransactions.length === 0) {
      // Jika tidak ada transaksi, spentAmount dan progress adalah 0
      const calculatedBudgets = rawBudgets.map(budget => {
        const budgetAmountNumber = typeof budget.amount === 'object' && budget.amount !== null && 'toNumber' in budget.amount
          ? (budget.amount as any).toNumber()
          : Number(budget.amount);
        return {
          ...budget,
          budgetAmount: budgetAmountNumber,
          category: budget.category,
          spentAmount: 0,
          progressPercentage: 0,
        };
      });
      setDisplayBudgets(calculatedBudgets);
    } else {
      setDisplayBudgets([]);
    }
  }, [rawBudgets, allTransactions]);


  const handleAddBudget = () => {
    if (expenseCategories.length === 0) {
      toast.warning("Tidak ada kategori 'Pengeluaran' yang tersedia. Silakan buat kategori pengeluaran terlebih dahulu.");
      return;
    }
    setEditingBudget(null);
    setShowForm(true);
  };

  const handleEditBudget = (budget: BudgetDisplayData) => {
    // Saat edit, kita perlu data original Budget, bukan BudgetDisplayData untuk initialForm
    // Atau pastikan BudgetForm bisa handle BudgetDisplayData
    // Untuk simplicity, kita cari budget original dari rawBudgets untuk form
    const originalBudget = rawBudgets.find(rb => rb.id === budget.id);
    if (originalBudget) {
      // Kita tetap set editingBudget dengan BudgetDisplayData untuk UI konsistensi,
      // tapi BudgetForm akan menerima originalBudget jika perlu (atau kita sesuaikan BudgetForm)
      // Untuk saat ini, BudgetForm menerima initialData dengan amount sebagai string, jadi konversi diperlukan
      setEditingBudget({
        ...originalBudget,
        budgetAmount: typeof originalBudget.amount === 'object' ? (originalBudget.amount as any).toNumber() : Number(originalBudget.amount),
        spentAmount: budget.spentAmount, // Ini dari display, tidak relevan untuk form edit amount
        progressPercentage: budget.progressPercentage, // Ini dari display
      });
      setShowForm(true);
    }
  };

  // 3. Modifikasi handleDeleteBudget untuk membuka modal
  const handleDeleteBudgetClick = (budgetId: number) => {
    setItemToDeleteId(budgetId); // Simpan ID item yang akan dihapus
    setIsConfirmModalOpen(true); // Buka modal
  };

  // 4. Fungsi untuk menjalankan penghapusan setelah dikonfirmasi
  const executeDeleteBudget = async () => {
    if (itemToDeleteId === null) return;

    setIsDeleting(true); // Set loading state untuk tombol di modal
    try {
      const response = await fetch(`/api/budgets/${itemToDeleteId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || 'Gagal menghapus anggaran.');
      } else {
        toast.success('Anggaran berhasil dihapus.');
        fetchData(); // Muat ulang data
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menghapus anggaran.');
      console.error("Delete budget error:", err);
    } finally {
      setIsConfirmModalOpen(false); // Tutup modal
      setItemToDeleteId(null);
      setIsDeleting(false); // Reset loading state
    }
  };


  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBudget(null);
    fetchData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBudget(null);
  };

  if (isLoading) return <p className="text-center text-gray-500 mt-8">Memuat data...</p>;
  if (error) return <p className="text-center text-red-500 mt-8 bg-red-100 p-3 rounded-md">Error: {error}</p>;

  return (
<div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Anggaran</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola anggaran bulanan Anda</p>
        </div>
        <button
          onClick={handleAddBudget}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Anggaran
        </button>
      </div>

      {/* Empty State */}
      {displayBudgets.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl text-center">
          <p className="text-gray-500 mb-4">Belum ada anggaran yang ditetapkan</p>
          <button
            onClick={handleAddBudget}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            Tambah Anggaran Pertama
          </button>
        </div>
      )}

      {/* Budget Cards */}
      {displayBudgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayBudgets.map((budget) => {
            const isExceeded = budget.spentAmount > budget.budgetAmount;
            const progressPercentage = Math.min(budget.progressPercentage, 100);
            const progressBarColor = isExceeded 
              ? 'bg-red-500' 
              : (progressPercentage > 80 ? 'bg-yellow-500' : 'bg-indigo-600');

            return (
              <div 
                key={budget.id} 
                className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow ${
                  isExceeded ? 'border-red-300' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {budget.category?.name || 'Kategori Dihapus'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {getMonthName(budget.month)} {budget.year}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditBudget(budget)}
                      className="text-gray-400 hover:text-indigo-600 p-1"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudgetClick(budget.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Hapus"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Highlighted Usage Section */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">
                      Terpakai: <span className="font-bold text-gray-800">
                        {formatCurrency(budget.spentAmount)}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      dari <span className="font-bold text-gray-800">
                        {formatCurrency(budget.budgetAmount)}
                      </span>
                    </p>
                  </div>
                  {isExceeded && (
                    <div className="flex items-center text-xs text-red-600 font-medium mt-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Melebihi: {formatCurrency(budget.spentAmount - budget.budgetAmount)}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className={`${progressBarColor} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>{progressPercentage.toFixed(0)}%</span>
                  <span>100%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Form Modal */}
      {showForm && (
        <BudgetForm
          initialData={editingBudget ? rawBudgets.find(rb => rb.id === editingBudget.id) : null}
          expenseCategories={expenseCategories}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Konfirmasi Penghapusan"
        message={`Apakah Anda yakin ingin menghapus anggaran untuk "${displayBudgets.find(b => b.id === itemToDeleteId)?.category?.name || 'item ini'}" periode ${itemToDeleteId ? getMonthName(displayBudgets.find(b => b.id === itemToDeleteId)?.month || 0) : ''} ${itemToDeleteId ? displayBudgets.find(b => b.id === itemToDeleteId)?.year : ''}?`}
        onConfirm={executeDeleteBudget}
        onCancel={() => setIsConfirmModalOpen(false)}
        confirmButtonText="Ya, Hapus"
        isConfirming={isDeleting}
      />
    </div>
  );
}