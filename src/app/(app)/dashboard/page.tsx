// src/app/(app)/dashboard/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '../../lib/prisma';
import { TransactionType, Transaction as PrismaTransaction, Category as PrismaCategory } from '@prisma/client';
import ExpenseChart from './components/ExpenseChart';
import RecentTransactions from './components/RecentTransactions';
import { redirect } from 'next/navigation';
import { Wallet, ArrowUp, ArrowDown, PieChart, Clock } from 'lucide-react';

// Tetap menggunakan helper yang sama
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

interface FetchedTransactionWithCategory extends PrismaTransaction {
  category: PrismaCategory | null;
}

interface PlainTransactionForClient {
  id: number;
  description: string | null;
  amount: number;
  date: string;
  type: TransactionType;
  categoryId: number;
  category: {
    id: number;
    name: string;
    type: string;
  } | null;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/login');
  }

  const userId = parseInt(session.user.id);

  if (isNaN(userId)) {
    return <p>Error: User ID tidak valid.</p>;
  }

  const allTransactions: FetchedTransactionWithCategory[] = await prisma.transaction.findMany({
    where: { userId: userId },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  // Logika perhitungan tetap sama
  let currentBalance = 0;
  let incomeThisMonth = 0;
  let expensesThisMonth = 0;
  const expensesByCategoryThisMonth: { name: string; total: number }[] = [];
  const categoryTotals: { [key: string]: number } = {};

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  allTransactions.forEach(transaction => {
    if (transaction.type === TransactionType.Pemasukan) {
      currentBalance += transaction.amount.toNumber();
    } else {
      currentBalance -= transaction.amount.toNumber();
    }

    const transactionDate = new Date(transaction.date);
    if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
      if (transaction.type === TransactionType.Pemasukan) {
        incomeThisMonth += transaction.amount.toNumber();
      } else {
        expensesThisMonth += transaction.amount.toNumber();
        if (transaction.category) {
          const categoryName = transaction.category.name;
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + transaction.amount.toNumber();
        }
      }
    }
  });

  for (const categoryName in categoryTotals) {
    expensesByCategoryThisMonth.push({ name: categoryName, total: categoryTotals[categoryName] });
  }

  const recentTransactionsForClient: PlainTransactionForClient[] = allTransactions
    .slice(0, 5)
    .map(tx => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount.toNumber(),
      date: tx.date.toISOString(),
      type: tx.type,
      categoryId: tx.categoryId,
      category: tx.category
        ? {
            id: tx.category.id,
            name: tx.category.name,
            type: tx.category.type,
          }
        : null,
    }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Selamat Datang, <span className="text-indigo-600">{session?.user?.name || session?.user?.email}</span>
        </h1>
        <p className="text-gray-500">
          Ringkasan keuangan Anda hari ini
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Saldo Saat Ini" 
          value={currentBalance} 
          icon={<Wallet className="h-5 w-5" />}
          isPositive={currentBalance >= 0}
        />
        <StatCard 
          title="Pemasukan Bulan Ini" 
          value={incomeThisMonth} 
          icon={<ArrowUp className="h-5 w-5" />}
          isPositive={true}
        />
        <StatCard 
          title="Pengeluaran Bulan Ini" 
          value={expensesThisMonth} 
          icon={<ArrowDown className="h-5 w-5" />}
          isPositive={false}
        />
      </div>

      {/* Charts and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <PieChart className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-800">Pengeluaran per Kategori</h2>
          </div>
          {expensesByCategoryThisMonth.length > 0 ? (
            <ExpenseChart data={expensesByCategoryThisMonth} />
          ) : (
            <div className="text-center py-8 text-gray-400">
              Belum ada data pengeluaran bulan ini
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-800">Transaksi Terakhir</h2>
          </div>
          <RecentTransactions transactions={recentTransactionsForClient} />
        </div>
      </div>
    </div>
  );
}

// Komponen StatCard untuk tampilan yang lebih konsisten
function StatCard({ title, value, icon, isPositive }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  isPositive: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-1 rounded-lg bg-indigo-50 text-indigo-500">
          {icon}
        </div>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}