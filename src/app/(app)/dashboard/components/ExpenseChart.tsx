"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Palette } from 'lucide-react';

interface ChartData {
  name: string;
  total: number;
}

interface ExpenseChartProps {
  data: ChartData[];
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#14B8A6', '#F97316', '#64748B', '#A855F7'
];

const formatCurrencyForTooltip = (value: number) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(value);
};

export default function ExpenseChart({ data }: ExpenseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Palette className="w-12 h-12 mb-2" />
        <p>Belum ada data pengeluaran</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
          layout="vertical" // Ubah ke vertikal untuk tampilan yang lebih unik
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            type="number" 
            tickFormatter={(value) => `Rp${value/1000}k`}
            tick={{ fontSize: 12 }}
            axisLine={false}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={80}
            tick={{ fontSize: 12 }}
            axisLine={false}
          />
          <Tooltip 
            formatter={(value: any) => formatCurrencyForTooltip(value as number)}
            contentStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: 'none'
            }}
          />
          <Bar 
            dataKey="total" 
            name="Total Pengeluaran"
            animationDuration={1500}
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-1" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}