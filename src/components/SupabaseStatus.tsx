import React, { useState, useEffect } from 'react';
import { Database } from 'lucide-react';

export const SupabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'active' | 'inactive'>('checking');

  useEffect(() => {
    fetch('/api/supabase/status')
      .then(res => res.json())
      .then(data => setStatus(data.data?.connected ? 'active' : 'inactive'))
      .catch(() => setStatus('inactive'));
  }, []);

  return (
    <div className={`flex items-center space-x-2 text-xs font-bold px-3 py-1.5 rounded-full border ${status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
        <Database className="w-3.5 h-3.5" />
        <span>Supabase: {status === 'checking' ? 'Checking...' : status.toUpperCase()}</span>
    </div>
  );
};
