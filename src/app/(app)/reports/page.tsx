// src/app/(app)/reports/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Circle } from 'lucide-react';
// Helper untuk format mata uang (asumsi sudah ada)
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Data yang diharapkan dari API laporan
interface ReportData {
    month: number;
    year: number;
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    expensesByCategory: {
        categoryId: number;
        categoryName: string;
        total: number;
    }[];
    transactionCount: number;
}

// Helper untuk daftar bulan dan tahun (bisa dibuat lebih dinamis)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // 5 tahun terakhir
const months = [
    { value: 1, name: 'Januari' }, { value: 2, name: 'Februari' }, { value: 3, name: 'Maret' },
    { value: 4, name: 'April' }, { value: 5, name: 'Mei' }, { value: 6, name: 'Juni' },
    { value: 7, name: 'Juli' }, { value: 8, name: 'Agustus' }, { value: 9, name: 'September' },
    { value: 10, name: 'Oktober' }, { value: 11, name: 'November' }, { value: 12, name: 'Desember' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent * 100 < 5) return null; // Jangan tampilkan label jika persentase terlalu kecil

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
            {`${name} (${(percent * 100).toFixed(0)}%)`}
        </text>
    );
};

const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
            <div key={`legend-${index}`} className="flex items-center text-xs">
                <Circle className="h-3 w-3 mr-1" fill={entry.color} />
                <span>{entry.value}</span>
            </div>
        ))}
    </div>
);




export default function ReportsPage() {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReportData = async (month: number, year: number) => {
        setIsLoading(true);
        setError(null);
        setReportData(null); // Kosongkan data sebelumnya

        try {
            const response = await fetch(`/api/reports/income-expense-summary?month=${month}&year=${year}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal mengambil data laporan');
            }
            const data: ReportData = await response.json();
            setReportData(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    // Panggil saat komponen pertama kali dimuat untuk bulan ini
    useEffect(() => {
        fetchReportData(selectedMonth, selectedYear);
    }, []); // Hanya saat mount awal, atau jika mau otomatis saat bulan/tahun berubah, tambahkan ke dependency array

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        fetchReportData(selectedMonth, selectedYear);
    };

    // Data untuk Bar Chart Pemasukan vs Pengeluaran
    const incomeExpenseChartData = reportData ? [
        { name: 'Pemasukan', jumlah: reportData.totalIncome },
        { name: 'Pengeluaran', jumlah: reportData.totalExpenses },
    ] : [];

    // Data untuk Pie Chart Pengeluaran per Kategori
    const expenseByCategoryChartData = reportData?.expensesByCategory.map(item => ({
        name: item.categoryName,
        value: item.total,
    })) || [];

    return (
        <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Laporan Keuangan Bulanan</h1>

            {/* Filter Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                        >
                            {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
                    >
                        {isLoading ? 'Memuat...' : 'Tampilkan Laporan'}
                    </button>
                </form>
            </div>

            {isLoading && <div className="text-center py-8 text-gray-500">Memuat laporan...</div>}
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6">{error}</div>}

            {reportData && !isLoading && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center">
                                <div className="p-2 rounded-lg bg-green-50 text-green-600 mr-3">
                                    <ArrowDown className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Pemasukan</p>
                                    <p className="text-xl font-bold text-gray-800">{formatCurrency(reportData.totalIncome)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center">
                                <div className="p-2 rounded-lg bg-red-50 text-red-600 mr-3">
                                    <ArrowUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Pengeluaran</p>
                                    <p className="text-xl font-bold text-gray-800">{formatCurrency(reportData.totalExpenses)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center">
                                <div className={`p-2 rounded-lg mr-3 ${reportData.netAmount >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                    {reportData.netAmount >= 0 ? (
                                        <TrendingUp className="h-5 w-5" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Saldo Bersih</p>
                                    <p className={`text-xl font-bold ${reportData.netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'
                                        }`}>
                                        {formatCurrency(reportData.netAmount)}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                {reportData.transactionCount} transaksi di periode ini
                            </p>
                        </div>
                    </div>

                    {/* Income vs Expense Chart */}
                    {(reportData.totalIncome > 0 || reportData.totalExpenses > 0) && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <span className="w-2 h-5 bg-indigo-600 rounded-full mr-2"></span>
                                Perbandingan Pemasukan & Pengeluaran
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        key={`bar-chart-${selectedMonth}-${selectedYear}`}
                                        data={incomeExpenseChartData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis type="number" tickFormatter={(value) => `Rp${value / 1000}k`} />
                                        <YAxis type="category" dataKey="name" />
                                        <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                                        <Bar
                                            dataKey="jumlah"
                                            name="Jumlah"
                                            animationDuration={2000}
                                            animationEasing="ease-out"
                                            radius={[0, 4, 4, 0]}
                                        >
                                            {incomeExpenseChartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.name === 'Pemasukan' ? '#10B981' : '#EF4444'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>

                            </div>
                        </div>
                    )}

                    {/* Expense Breakdown */}
                    {reportData.expensesByCategory.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Table */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <span className="w-2 h-5 bg-indigo-600 rounded-full mr-2"></span>
                                    Rincian Pengeluaran per Kategori
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Persentase</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {reportData.expensesByCategory.map(item => (
                                                <tr key={item.categoryId} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{item.categoryName}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-800">
                                                        {formatCurrency(item.total)}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-800">
                                                        {reportData.totalExpenses > 0 ? ((item.total / reportData.totalExpenses) * 100).toFixed(1) : 0}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pie Chart */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <span className="w-2 h-5 bg-indigo-600 rounded-full mr-2"></span>
                                    Distribusi Pengeluaran
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expenseByCategoryChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {expenseByCategoryChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any) => formatCurrency(value as number)}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                                    border: 'none'
                                                }}
                                            />
                                            <Legend content={<CustomLegend />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}