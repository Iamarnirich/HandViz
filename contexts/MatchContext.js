"use client";

import { createContext, useContext, useState } from "react";

const MatchContext = createContext();

export function MatchProvider({ children }) {
  const [equipeLocale, setEquipeLocale] = useState(null);
  const [equipeAdverse, setEquipeAdverse] = useState(null);
  const [idMatch, setIdMatch] = useState(null);
  const [nomMatch, setNomMatch] = useState(null);
  const [isTousLesMatchs, setIsTousLesMatchs] = useState(true);
  const [matchs, setMatchs] = useState([]); // ✅ nouveau

  return (
    <MatchContext.Provider
      value={{
        equipeLocale,
        setEquipeLocale,
        equipeAdverse,
        setEquipeAdverse,
        idMatch,
        setIdMatch,
        nomMatch,
        setNomMatch,
        isTousLesMatchs,
        setIsTousLesMatchs,
        matchs,
        setMatchs,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  return useContext(MatchContext);
}
