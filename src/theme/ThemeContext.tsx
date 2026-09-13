import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, lightTheme, defaultTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme>(defaultTheme);

type Props = {
  children: React.ReactNode;
  theme?: Theme;
  mode?: 'light' | 'dark';
};

export function ThemeProvider({ children, theme, mode = 'light' }: Props) {
  const value = useMemo(
    () => theme ?? (mode === 'light' ? lightTheme : darkTheme),
    [theme, mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
