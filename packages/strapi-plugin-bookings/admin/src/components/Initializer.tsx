import type React from "react";
import { useEffect, useRef } from "react";

import { PLUGIN_ID } from "../pluginId";

interface InitializerProps {
  setPlugin: (id: string) => void;
}

export const Initializer: React.FC<InitializerProps> = ({ setPlugin }) => {
  const ref = useRef(setPlugin);

  useEffect(() => {
    ref.current?.(PLUGIN_ID);
  }, []);

  return null;
};

export default Initializer;
