import React, { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "./theme";

type ColorModeCtx = { mode: "light" | "dark"; toggle: () => void };
const Ctx = createContext<ColorModeCtx | null>(null);

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("colorMode");
    return saved === "dark" ? "dark" : "light";
  });

  const toggle = () => {
    setMode((m) => {
      const next = m === "light" ? "dark" : "light";
      localStorage.setItem("colorMode", next);
      return next;
    });
  };

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, toggle }), [mode]);

  return (
    <Ctx.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}

export function useColorMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useColorMode must be used within ColorModeProvider");
  return ctx;
}