'use client';

import { useState, useEffect } from 'react';

export function useApiInit() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/teams/uon-key');
      const data = await response.json();
      
      if (response.ok && data.hasKey) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Ошибка при проверке подключения:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    isConnected,
    isLoading,
    checkConnection,
  };
}