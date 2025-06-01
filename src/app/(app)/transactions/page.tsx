// src/app/(app)/transactions/page.tsx
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Transaction as PrismaTransaction, Category, CategoryType, TransactionType } from '@prisma/client';
import TransactionForm from './components/TransactionForm';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { Plus, Funnel, RotateCcw, Edit, Trash2 } from 'lucide-react';



// Helper untuk format mata uang dan tanggal (asumsi sudah ada dan benar)
const formatCurrency = (amount: number | string) => {
  const numberAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(numberAmount);
};

const formatDate = (dateString: string | Date) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// Tipe untuk transaksi yang diterima dari API dan digunakan di state
// API seharusnya sudah mengembalikan amount sebagai number dan date sebagai ISO string
interface DisplayTransaction extends Omit<PrismaTransaction, 'amount' | 'date'> {
  amount: number; // Pastikan ini number
  date: string;   // Pastikan ini string (ISO date)
  category: {
    name: string;
    type: CategoryType; // Gunakan enum CategoryType
  } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<DisplayTransaction | null>(null);

  // State untuk filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // string untuk value <select>
  const [selectedType, setSelectedType] = useState(''); // string untuk value <select>
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState('');     // YYYY-MM-DD

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemDeleteId, SetItemDeletedId] = useState<Number|null>(null); 
  const [isDeleting, setIsDeleting] = useState(false); 

  const fetchData = useCallback(async (isFiltering = false) => {
    if (!isFiltering) setIsLoading(true); // Hanya set loading true jika bukan dari filter manual
    setError(null);

    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedCategoryId) params.append('categoryId', selectedCategoryId);
    if (selectedType) params.append('type', selectedType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    // Tambahkan parameter pagination jika Anda menggunakannya di API
    // params.append('page', '1');
    // params.append('limit', '100'); // Ambil lebih banyak jika tidak ada pagination UI

    try {
      // Fetch kategori hanya sekali atau jika diperlukan (misal, tidak berubah sering)
      // Untuk contoh ini, kita fetch ulang, tapi bisa dioptimasi
      const [transactionsRes, categoriesRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch('/api/categories') // Kategori tetap diambil untuk dropdown filter & form
      ]);

      if (!transactionsRes.ok) {
        const errorData = await transactionsRes.json();
        throw new Error(errorData.message || 'Gagal mengambil data transaksi');
      }
      const transactionsData = await transactionsRes.json();
      // API Anda mengembalikan { transactions: [...] }
      // Pastikan data dari API sesuai dengan tipe DisplayTransaction (amount: number, date: string)
      setTransactions(transactionsData.transactions || []);

      if (!categoriesRes.ok) {
        const errorData = await categoriesRes.json();
        throw new Error(errorData.message || 'Gagal mengambil data kategori');
      }
      const categoriesData: Category[] = await categoriesRes.json();
      setCategories(categoriesData);

    } catch (err) {
      setError((err as Error).message);
      setTransactions([]); // Kosongkan jika ada error
    } finally {
      if (!isFiltering) setIsLoading(false);
    }
  }, [searchTerm, selectedCategoryId, selectedType, startDate, endDate]); // Tambahkan dependensi filter

  useEffect(() => {
    fetchData(); // Panggil saat komponen mount
  }, [fetchData]); // fetchData sekarang punya dependensi, jadi akan terpanggil jika filter berubah
                  // Jika tidak ingin auto-apply, pisahkan logic apply filter ke tombol

  const handleApplyFilters = () => {
    fetchData(true); // true menandakan ini adalah filter manual, tidak perlu set isLoading=true global
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
    // Setelah mereset state, panggil fetchData untuk mengambil semua data lagi
    // Kita bisa tunda sedikit agar state terupdate sebelum fetch, atau fetchData langsung
    // Untuk kesederhanaan, kita panggil fetchData yang akan menggunakan state yang baru di-reset (mungkin perlu sedikit penyesuaian jika fetchData tidak langsung membaca state terbaru)
    // Cara yang lebih baik adalah fetchData menerima argumen filter
    // Atau, karena fetchData ada di useCallback dependencies, perubahan state akan memicunya.
    // Namun, untuk explicit reset, kita bisa langsung panggil.
    // Untuk memastikan state terupdate sebelum fetch, kita bisa buat fetchData menerima object filter.
    // Atau, kita biarkan useEffect dengan fetchData di dependencies yang menghandle ini.
    // Untuk 'Reset' button, lebih baik fetchData dipanggil setelah state direset:
    const resetAndFetch = async () => {
        setSearchTerm('');
        setSelectedCategoryId('');
        setSelectedType('');
        setStartDate('');
        setEndDate('');
        // fetchData akan terpanggil oleh useEffect karena dependensinya berubah
    };
    resetAndFetch();
    // Jika ingin langsung tanpa menunggu useEffect, buat fetchData terima params
    // fetchData(true, { searchTerm: '', selectedCategoryId: '', ... });
  };


  const handleAddTransaction = () => {
    // ... (sama seperti sebelumnya)
    if (categories.length === 0) {
        toast.error("Tidak ada kategori tersedia. Silakan buat kategori terlebih dahulu.");
        return;
    }
    setEditingTransaction(null);
    setShowForm(true);
  };

  const handleEditTransaction = (transaction: DisplayTransaction) => {
    // ... (sama seperti sebelumnya)
    // Pastikan TransactionForm menerima initialData dengan amount: number dan date: string (YYYY-MM-DD)
    // Jika TransactionForm mengharapkan amount: string, konversi di sini atau di form.
    // Form sudah menghandle amount.toString() dan new Date().toISOString().split('T')[0]
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDeleteTransactionClick = async (transactionId: number) => {
    // ... (sama seperti sebelumnya, panggil fetchData setelah sukses)
    SetItemDeletedId(transactionId);
    setIsConfirmModalOpen(true);
  };

  const executeDeleteTransaction = async () => {
    if (itemDeleteId === null) return; // Pastikan ada ID yang akan dihapus

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${itemDeleteId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || 'Gagal menghapus transaksi.');
      } else {
        toast.success('Transaksi berhasil dihapus.');
        fetchData(); // Muat ulang daftar transaksi
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menghapus transaksi.');
      console.error("Delete transaction error:", err);
    } finally {
      setIsConfirmModalOpen(false); // Tutup modal
      SetItemDeletedId(null); // Reset ID yang akan dihapus
      setIsDeleting(false); // Reset loading state
    }
  };

  const handleFormSuccess = () => {
    // ... (sama seperti sebelumnya, panggil fetchData setelah sukses)
    setShowForm(false);
    setEditingTransaction(null);
    fetchData();
  };

  const handleFormCancel = () => {
    // ... (sama seperti sebelumnya)
    setShowForm(false);
    setEditingTransaction(null);
  };


  if (isLoading && transactions.length === 0 && categories.length === 0) {
    return <p className="text-center text-gray-500 mt-8">Memuat data...</p>;
  }
  // Jangan tampilkan error global jika hanya error filter, tapi error fetch awal tetap penting
  if (error && isLoading && transactions.length === 0) return <p className="text-center text-red-500 mt-8 bg-red-100 p-3 rounded-md">Error: {error}</p>;


  return (
<div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Transaksi</h1>
        <button
          onClick={handleAddTransaction}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Transaksi
        </button>
      </div>

      {/* Filter Section */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Cari Deskripsi
            </label>
            <input
              type="text"
              id="search"
              placeholder="Makan siang..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
            />
          </div>

          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              id="categoryFilter"
              value={selectedCategoryId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
            >
              <option value="">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Tipe
            </label>
            <select
              id="typeFilter"
              value={selectedType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
            >
              <option value="">Semua Tipe</option>
              <option value={TransactionType.Pemasukan}>Pemasukan</option>
              <option value={TransactionType.Pengeluaran}>Pengeluaran</option>
            </select>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-black"
            />
          </div>

          <div className="col-span-full flex gap-2 mt-2">
            <button
              onClick={handleApplyFilters}
              className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Funnel className="h-4 w-4 mr-2" />
              Terapkan Filter
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
          </div>
        </div>

        {error && !isLoading && (
          <div className="mt-3 p-2 bg-red-50 text-red-600 rounded-lg text-sm">
            Error filter: {error}
          </div>
        )}
      </div>

      {/* Loading and Empty States */}
      {isLoading && (
        <div className="flex justify-center items-center p-8 text-gray-500">
          Memuat transaksi...
        </div>
      )}

      {!isLoading && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl text-center">
          <p className="text-gray-500">
            {searchTerm || selectedCategoryId || selectedType || startDate || endDate
              ? "Tidak ada transaksi yang cocok dengan filter Anda."
              : "Belum ada transaksi yang dicatat."}
          </p>
        </div>
      )}

      {/* Transactions Table */}
      {!isLoading && transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.category?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === TransactionType.Pemasukan
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      transaction.type === TransactionType.Pemasukan ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === TransactionType.Pengeluaran && '-'}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransactionClick(transaction.id)}
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

      {/* Keep your existing TransactionForm and ConfirmationModal components */}
      {showForm && (
        <TransactionForm
          initialData={editingTransaction}
          categories={categories}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Konfirmasi Hapus Transaksi"
        message="Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={executeDeleteTransaction}
        onCancel={() => setIsConfirmModalOpen(false)}
        confirmButtonText="Ya, Hapus"
        isConfirming={isDeleting}
      />
    </div>
  );
}