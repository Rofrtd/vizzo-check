'use client';

import { createContext, useContext, ReactNode } from 'react';

export type BasePath = '/admin' | '/agency';

export interface PanelContextType {
  basePath: BasePath;
  panelLabel: string;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export function PanelProvider({
  basePath,
  panelLabel,
  children,
}: {
  basePath: BasePath;
  panelLabel: string;
  children: ReactNode;
}) {
  return (
    <PanelContext.Provider value={{ basePath, panelLabel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel(): PanelContextType {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error('usePanel must be used within a PanelProvider');
  }
  return context;
}
