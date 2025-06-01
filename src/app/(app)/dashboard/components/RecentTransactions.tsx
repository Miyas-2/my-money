"use client";

import Link from 'next/link';
import { TransactionType } from '@prisma/client';
import { ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';

interface PlainCategory {
  id: number;
  name: string;
  type: string;
}

interface PlainTransaction {
  id: number;
  description: string | null;
  amount: number;
  date: string;
  type: TransactionType;
  category: PlainCategory | null;
}

interface RecentTransactionsProps {
  transactions: PlainTransaction[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hari ini';
  }

  return date.toLocaleDateString('id-ID', {
    day: '2-digit', 
    month: 'short', 
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
        <Plus className="w-6 h-6 text-gray-400 mb-2" />
        <p className="text-gray-500">Belum ada transaksi</p>
        <Link href="/transactions/new" className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Tambah Transaksi
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <span>Transaksi Terakhir</span>
        {transactions.length > 0 && (
          <Link href="/transactions" className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            Lihat Semua
          </Link>
        )}
      </h3>

      <div className="divide-y divide-gray-100">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <div className={`mt-1 p-2 rounded-lg ${
                transaction.type === TransactionType.Pemasukan 
                  ? 'bg-green-50 text-green-600' 
                  : 'bg-red-50 text-red-600'
              }`}>
                {transaction.type === TransactionType.Pemasukan ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {transaction.description || transaction.category?.name || 'Transaksi'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(transaction.date)}
                  {transaction.category?.name && ` • ${transaction.category.name}`}
                </p>
              </div>
              
              <div className={`text-right ${
                transaction.type === TransactionType.Pemasukan 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                <p className="text-sm font-semibold">
                  {transaction.type === TransactionType.Pemasukan ? '+' : '-'}
                  {formatCurrency(transaction.amount).replace('Rp', '')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}