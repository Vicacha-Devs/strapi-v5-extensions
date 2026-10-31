import { useEffect, useRef } from "react";

import { PLUGIN_ID } from "../../../shared/pluginId";

type InitializerProps = {
  setPlugin: (id: string) => void;
};

export const Initializer = ({ setPlugin }: InitializerProps) => {
  const ref = useRef<(id: string) => void>(setPlugin);

  useEffect(() => {
    ref.current?.(PLUGIN_ID);
  }, []);

  return null;
};
