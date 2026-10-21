import * as React from 'react';
import { PLUGIN_ID } from '../pluginId';

interface InitializerProps {
  setPlugin: (id: string) => void;
}

export const Initializer: React.FC<InitializerProps> = ({ setPlugin }) => {
  const ref = React.useState(() => setPlugin)[0];

  React.useEffect(() => {
    ref(PLUGIN_ID);
  }, [ref]);

  return null;
};

export default Initializer;
