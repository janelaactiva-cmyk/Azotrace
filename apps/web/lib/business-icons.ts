export const BUSINESS_TYPES = [
  { value: 'carne', icon: '🥩', label: 'Carne', color: '#DC2626', bg: '#fee2e2', sidebar: '#1a1a2e' },
  { value: 'leite', icon: '🥛', label: 'Leite', color: '#60A5FA', bg: '#eff6ff', sidebar: '#1a2a3e' },
  { value: 'fruta', icon: '🍎', label: 'Fruta', color: '#34D399', bg: '#ecfdf5', sidebar: '#1a2e2a' },
  { value: 'verdura', icon: '🥬', label: 'Verdura', color: '#34D399', bg: '#ecfdf5', sidebar: '#1a2e2a' },
  { value: 'grao', icon: '🌾', label: 'Grão', color: '#FBBF24', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'peixe', icon: '🐟', label: 'Peixe', color: '#3B82F6', bg: '#eff6ff', sidebar: '#1a2a3e' },
  { value: 'ovos', icon: '🥚', label: 'Ovos', color: '#FCD34D', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'mel', icon: '🍯', label: 'Mel', color: '#F59E0B', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'queijo', icon: '🧀', label: 'Queijo', color: '#FBBF24', bg: '#fffbeb', sidebar: '#2e2a1a' },
];

export function getBusinessIcon(tipo: string) {
  const found = BUSINESS_TYPES.find(t => t.value === tipo);
  return found || { 
    icon: '📦', 
    label: tipo || 'Outro', 
    color: '#6B7280', 
    bg: '#f3f4f6',
    sidebar: '#1a1a2e' 
  };
}
