import { useState, useEffect } from 'react';

export interface Router {
  push: (path: string) => void;
  back: () => void;
}

export function useRouter(): Router {
  const push = (path: string) => {
    let target = path;
    if (target.startsWith('/')) {
      target = '#' + target;
    } else if (!target.startsWith('#')) {
      target = '#/' + target;
    }
    window.location.hash = target;
  };

  const back = () => {
    window.history.back();
  };

  return { push, back };
}

export function useSearchParams() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const queryIndex = hash.indexOf('?');
  const queryString = queryIndex !== -1 ? hash.substring(queryIndex) : '';
  const searchParams = new URLSearchParams(queryString);

  return {
    get: (key: string) => searchParams.get(key),
    getAll: (key: string) => searchParams.getAll(key),
    has: (key: string) => searchParams.has(key),
  };
}

export function usePathname(): string {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
  const pathWithoutQuery = cleanHash.split('?')[0];
  
  return pathWithoutQuery || '/';
}
