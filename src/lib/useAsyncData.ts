import { useEffect, useEffectEvent, useState } from 'react';

interface AsyncDataState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useAsyncData<T>(dependencies: readonly unknown[], loader: () => Promise<T>): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const dependenciesKey = JSON.stringify(dependencies);
  const runLoader = useEffectEvent(loader);

  useEffect(() => {
    let isActive = true;

    async function execute() {
      setLoading(true);
      setError(null);

      try {
        const result = await runLoader();
        if (isActive) {
          setData(result);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : 'Не удалось загрузить данные.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void execute();

    return () => {
      isActive = false;
    };
  }, [dependenciesKey, reloadToken]);

  return {
    data,
    error,
    loading,
    reload: () => {
      setReloadToken((current) => current + 1);
    },
  };
}
