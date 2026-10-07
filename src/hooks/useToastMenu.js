// src/hooks/useToastMenu.js
import { useCallback, useEffect, useState } from 'react';
import { fetchToastMenu } from '../lib/toast.js';

export function useToastMenu() {
  const [menu, setMenu]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchToastMenu();
      setMenu(data);
    } catch (err) {
      setError(err.message);
      console.error('❌ Toast menu error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { menu, loading, error, reload: load };
}