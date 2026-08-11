'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BusinessContextType {
  selectedBusinessId: string | null;
  selectedBusinessType: string | null;
  selectedBusinessName: string | null;
  setSelectedBusiness: (id: string, type: string, name: string) => void;
  clearSelectedBusiness: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('selectedBusinessId');
    const savedType = localStorage.getItem('selectedBusinessType');
    const savedName = localStorage.getItem('selectedBusinessName');
    
    console.log('🔵 BusinessProvider - Carregado do localStorage:', { savedId, savedType, savedName });
    
    if (savedId && savedType) {
      setSelectedBusinessId(savedId);
      setSelectedBusinessType(savedType);
      setSelectedBusinessName(savedName || null);
    }
  }, []);

  const setSelectedBusiness = (id: string, type: string, name: string) => {
    console.log('🟢 BusinessProvider - setSelectedBusiness:', { id, type, name });
    
    setSelectedBusinessId(id);
    setSelectedBusinessType(type);
    setSelectedBusinessName(name);
    
    localStorage.setItem('selectedBusinessId', id);
    localStorage.setItem('selectedBusinessType', type);
    localStorage.setItem('selectedBusinessName', name);
  };

  const clearSelectedBusiness = () => {
    setSelectedBusinessId(null);
    setSelectedBusinessType(null);
    setSelectedBusinessName(null);
    
    localStorage.removeItem('selectedBusinessId');
    localStorage.removeItem('selectedBusinessType');
    localStorage.removeItem('selectedBusinessName');
  };

  return (
    <BusinessContext.Provider value={{
      selectedBusinessId,
      selectedBusinessType,
      selectedBusinessName,
      setSelectedBusiness,
      clearSelectedBusiness
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
