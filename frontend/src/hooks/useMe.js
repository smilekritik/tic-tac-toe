import { useState, useEffect } from 'react';
import client from '../api/client';

export function useMe() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMe = async () => {
    try {
      const { data } = await client.get('/me');
      setMe(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  return { me, loading, error, refetch: fetchMe };
}
