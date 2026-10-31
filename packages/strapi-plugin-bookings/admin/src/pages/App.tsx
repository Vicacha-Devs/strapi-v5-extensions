import React from "react";
import { Route, Routes } from "react-router-dom";

import { CalendarPage } from "./CalendarPage";

export const App: React.FC = () => {
  return (
    <Routes>
      <Route index element={<CalendarPage />} />
      <Route path="*" element={<CalendarPage />} />
    </Routes>
  );
};

export default App;
