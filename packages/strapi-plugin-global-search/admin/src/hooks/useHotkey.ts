import { useEffect, useRef } from 'react';

/**
 * Cmd+K on macOS, Ctrl+K elsewhere. Registered in the capture phase so it wins
 * against anything the admin or another plugin binds on the same combination.
 */
const useHotkey = (handler: () => void): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'k' && event.key !== 'K') return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey) return;

      event.preventDefault();
      event.stopPropagation();
      handlerRef.current();
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
};

export default useHotkey;
