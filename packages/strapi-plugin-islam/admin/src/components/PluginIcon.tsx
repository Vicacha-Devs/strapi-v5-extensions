import * as React from 'react';

export const PluginIcon: React.FC = () =>
  React.createElement(
    'svg',
    {
      width: '20',
      height: '20',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    React.createElement('path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }),
    React.createElement('path', { d: 'M19 3v4' }),
    React.createElement('path', { d: 'M21 5h-4' })
  );

export default PluginIcon;
