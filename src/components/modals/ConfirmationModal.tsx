// src/components/modals/ConfirmationModal.tsx
"use client";

import { Fragment } from 'react'; // Untuk transisi jika menggunakan Headless UI, tapi tidak wajib untuk dasar
import { XMarkIcon } from '@heroicons/react/24/outline';
import { X, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isConfirming?: boolean; // Untuk state loading pada tombol konfirmasi
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText = "Ya, Lanjutkan",
  cancelButtonText = "Batal",
  isConfirming = false,
}: ConfirmationModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
 <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-xl border border-gray-200 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 mb-6">{message}</p>
          
          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isConfirming}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {cancelButtonText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                confirmButtonText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}