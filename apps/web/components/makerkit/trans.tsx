'use client';

// Componente mock para substituir o Trans do Makerkit
export function Trans({ children, ...props }: any) {
  return <span {...props}>{children || 'Tradução'}</span>;
}

export function Translate({ children, ...props }: any) {
  return <span {...props}>{children || 'Tradução'}</span>;
}

export function useTranslations() {
  return (key: string) => key;
}
