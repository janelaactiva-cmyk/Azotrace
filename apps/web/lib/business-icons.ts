export const BUSINESS_ICONS = {
  carne: { icon: '🥩', label: 'Carne', color: '#DC2626' },
  leite: { icon: '🥛', label: 'Leite', color: '#60A5FA' },
  fruta: { icon: '🍎', label: 'Fruta', color: '#34D399' },
  verdura: { icon: '🥬', label: 'Verdura', color: '#34D399' },
  grao: { icon: '🌾', label: 'Grão', color: '#FBBF24' },
  peixe: { icon: '🐟', label: 'Peixe', color: '#3B82F6' },
  ovos: { icon: '🥚', label: 'Ovos', color: '#FCD34D' },
  mel: { icon: '🍯', label: 'Mel', color: '#F59E0B' },
  queijo: { icon: '🧀', label: 'Queijo', color: '#FBBF24' },
};

export function getIconInfo(tipo: string) {
  return BUSINESS_ICONS[tipo as keyof typeof BUSINESS_ICONS] || {
    icon: '📦',
    label: tipo || 'Outro',
    color: '#6B7280'
  };
}
