import * as React from 'react';
import { pluginId } from '../pluginId';

interface InitializerProps {
  setPlugin: (id: string) => void;
}

export const Initializer = ({ setPlugin }: InitializerProps) => {
  const ref = React.useRef<((id: string) => void) | undefined>(undefined);
  ref.current = setPlugin;

  React.useEffect(() => {
    if (ref.current) {
      ref.current(pluginId);
    }
  }, []);

  return null;
};
