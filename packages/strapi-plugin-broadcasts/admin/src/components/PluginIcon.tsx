import * as React from "react";

export const PluginIcon: React.FC = () =>
  React.createElement(
    "svg",
    {
      "width": "20",
      "height": "20",
      "viewBox": "0 0 24 24",
      "fill": "none",
      "stroke": "currentColor",
      "strokeWidth": "2",
      "strokeLinecap": "round",
      "strokeLinejoin": "round",
      "aria-hidden": "true",
    },
    React.createElement("path", { d: "m3 11 18-5v12L3 14v-3z" }),
    React.createElement("path", { d: "M11.6 16.8a3 3 0 1 1-5.8-1.6" })
  );

export default PluginIcon;
