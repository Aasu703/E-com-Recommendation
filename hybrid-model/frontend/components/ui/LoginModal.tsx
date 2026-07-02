import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, Lock, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login } = useAuth();
  const [selectedUser, setSelectedUser] = useState('U0001');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedUser);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e2130] border border-[#353a50] rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex justify-center mb-6">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <ShieldCheck className="h-10 w-10" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">Secure Authentication</h2>
        <p className="text-gray-400 text-center text-sm mb-8">
          Please log in to access your cart and complete purchases.
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Demo User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-[#151722] border border-[#353a50] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="U0001">U0001 - Aayush (Electronics Fan)</option>
              <option value="U0002">U0002 - Smriti (Fashion Fan)</option>
              <option value="U0003">U0003 - John (Book Reader)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            <Lock className="h-5 w-5" />
            Authenticate (JWT)
          </button>
        </form>
      </div>
    </div>
  );
};
