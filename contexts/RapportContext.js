"use client";

import { createContext, useContext, useState } from "react";

const RapportContext = createContext();

export function RapportProvider({ children }) {
  const [rapport, setRapport] = useState("offensif");

  return (
    <RapportContext.Provider value={{ rapport, setRapport }}>
      {children}
    </RapportContext.Provider>
  );
}

export function useRapport() {
  return useContext(RapportContext);
}
