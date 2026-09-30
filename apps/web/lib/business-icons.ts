export interface BusinessType {
  value: string;
  icon: string;
  label: string;
  color: string;
  bg: string;
  sidebar: string;
}

export const BUSINESS_TYPES: BusinessType[] = [
  // ===== AGROALIMENTAR =====
  { value: 'carne', icon: '🥩', label: 'Carne', color: '#DC2626', bg: '#fee2e2', sidebar: '#1a1a2e' },
  { value: 'leite', icon: '🥛', label: 'Leite', color: '#60A5FA', bg: '#eff6ff', sidebar: '#1a2a3e' },
  { value: 'fruta', icon: '🍎', label: 'Fruta', color: '#34D399', bg: '#ecfdf5', sidebar: '#1a2e2a' },
  { value: 'verdura', icon: '🥬', label: 'Verdura', color: '#34D399', bg: '#ecfdf5', sidebar: '#1a2e2a' },
  { value: 'grao', icon: '🌾', label: 'Grão', color: '#FBBF24', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'peixe', icon: '🐟', label: 'Peixe', color: '#3B82F6', bg: '#eff6ff', sidebar: '#1a2a3e' },
  { value: 'ovos', icon: '🥚', label: 'Ovos', color: '#FCD34D', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'mel', icon: '🍯', label: 'Mel', color: '#F59E0B', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'queijo', icon: '🧀', label: 'Queijo', color: '#FBBF24', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'manteiga', icon: '🧈', label: 'Manteiga', color: '#FBBF24', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'iogurte', icon: '🥣', label: 'Iogurte', color: '#A78BFA', bg: '#f5f3ff', sidebar: '#1e1a2e' },
  { value: 'vinho', icon: '🍷', label: 'Vinho', color: '#991B1B', bg: '#fef2f2', sidebar: '#2e1a1a' },
  { value: 'cerveja', icon: '🍺', label: 'Cerveja', color: '#F59E0B', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'azeite', icon: '🫒', label: 'Azeite', color: '#65A30D', bg: '#f7fee7', sidebar: '#1e2e1a' },
  { value: 'pao', icon: '🥖', label: 'Pão / Padaria', color: '#D97706', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'doce', icon: '🍰', label: 'Doces / Bolos', color: '#EC4899', bg: '#fdf2f8', sidebar: '#2e1a24' },
  { value: 'chocolate', icon: '🍫', label: 'Chocolate', color: '#78350F', bg: '#fef3c7', sidebar: '#2e2418' },
  { value: 'cafe', icon: '☕', label: 'Café', color: '#78350F', bg: '#fef3c7', sidebar: '#2e2418' },
  { value: 'cha', icon: '🍵', label: 'Chá', color: '#65A30D', bg: '#f7fee7', sidebar: '#1e2e1a' },
  { value: 'conserva', icon: '🥫', label: 'Conservas', color: '#DC2626', bg: '#fee2e2', sidebar: '#2e1a1a' },
  { value: 'cogumelo', icon: '🍄', label: 'Cogumelos', color: '#A16207', bg: '#fef3c7', sidebar: '#2e2418' },
  { value: 'especiaria', icon: '🌶️', label: 'Especiarias', color: '#DC2626', bg: '#fee2e2', sidebar: '#2e1a1a' },
  { value: 'erva', icon: '🌿', label: 'Ervas aromáticas', color: '#16A34A', bg: '#f0fdf4', sidebar: '#1a2e1e' },
  { value: 'cereal', icon: '🥣', label: 'Cereais', color: '#D97706', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'leguminosa', icon: '🫘', label: 'Leguminosas', color: '#78350F', bg: '#fef3c7', sidebar: '#2e2418' },

  // ===== AGRICULTURA =====
  { value: 'agricultura', icon: '🚜', label: 'Agricultura', color: '#65A30D', bg: '#f7fee7', sidebar: '#1e2e1a' },
  { value: 'horticultura', icon: '🥕', label: 'Horticultura', color: '#F97316', bg: '#fff7ed', sidebar: '#2e1e12' },
  { value: 'fruticultura', icon: '🍇', label: 'Fruticultura', color: '#7C3AED', bg: '#f5f3ff', sidebar: '#1e1a2e' },
  { value: 'floricultura', icon: '🌸', label: 'Floricultura', color: '#EC4899', bg: '#fdf2f8', sidebar: '#2e1a24' },
  { value: 'silvicultura', icon: '🌲', label: 'Silvicultura', color: '#166534', bg: '#f0fdf4', sidebar: '#1a2e1e' },
  { value: 'apicultura', icon: '🐝', label: 'Apicultura', color: '#F59E0B', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'viticultura', icon: '🍇', label: 'Viticultura', color: '#7C3AED', bg: '#f5f3ff', sidebar: '#1e1a2e' },

  // ===== PECUÁRIA =====
  { value: 'pecuaria', icon: '🐄', label: 'Pecuária', color: '#92400E', bg: '#fef3c7', sidebar: '#2e2418' },
  { value: 'avicultura', icon: '🐔', label: 'Avicultura', color: '#F59E0B', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'suinicultura', icon: '🐖', label: 'Suinicultura', color: '#EC4899', bg: '#fdf2f8', sidebar: '#2e1a24' },
  { value: 'caprinocultura', icon: '🐐', label: 'Caprinocultura', color: '#78716C', bg: '#f5f5f4', sidebar: '#1e1e1d' },
  { value: 'ovinocultura', icon: '🐑', label: 'Ovinocultura', color: '#A8A29E', bg: '#f5f5f4', sidebar: '#1e1e1d' },

  // ===== PESCA =====
  { value: 'pesca', icon: '🎣', label: 'Pesca', color: '#3B82F6', bg: '#eff6ff', sidebar: '#1a2a3e' },
  { value: 'aquacultura', icon: '🦐', label: 'Aquacultura', color: '#0891B2', bg: '#ecfeff', sidebar: '#1a2a2e' },
  { value: 'marisco', icon: '🦞', label: 'Marisco', color: '#DC2626', bg: '#fee2e2', sidebar: '#2e1a1a' },

  // ===== TRANSFORMAÇÃO =====
  { value: 'transformacao', icon: '🏭', label: 'Transformação', color: '#6B7280', bg: '#f3f4f6', sidebar: '#1e1e1e' },
  { value: 'moagem', icon: '⚙️', label: 'Moagem', color: '#78716C', bg: '#f5f5f4', sidebar: '#1e1e1d' },
  { value: 'conservacao', icon: '🧊', label: 'Conservação / Frio', color: '#0EA5E9', bg: '#f0f9ff', sidebar: '#1a2a3e' },
  { value: 'embalagem', icon: '📦', label: 'Embalagem', color: '#92400E', bg: '#fef3c7', sidebar: '#2e2418' },

  // ===== COMÉRCIO =====
  { value: 'retalho', icon: '🛒', label: 'Retalho', color: '#8B5CF6', bg: '#f5f3ff', sidebar: '#1e1a2e' },
  { value: 'distribuicao', icon: '🚚', label: 'Distribuição', color: '#F97316', bg: '#fff7ed', sidebar: '#2e1e12' },
  { value: 'grossista', icon: '📦', label: 'Grossista', color: '#78716C', bg: '#f5f5f4', sidebar: '#1e1e1d' },
  { value: 'importacao', icon: '🌍', label: 'Importação / Exportação', color: '#0891B2', bg: '#ecfeff', sidebar: '#1a2a2e' },

  // ===== SERVIÇOS =====
  { value: 'restaurante', icon: '🍽️', label: 'Restaurante', color: '#DC2626', bg: '#fee2e2', sidebar: '#2e1a1a' },
  { value: 'turismo', icon: '🏨', label: 'Turismo / Alojamento', color: '#0EA5E9', bg: '#f0f9ff', sidebar: '#1a2a3e' },
  { value: 'turismo_rural', icon: '🏡', label: 'Turismo Rural', color: '#65A30D', bg: '#f7fee7', sidebar: '#1e2e1a' },
  { value: 'servicos', icon: '🛠️', label: 'Serviços', color: '#6B7280', bg: '#f3f4f6', sidebar: '#1e1e1e' },
  { value: 'transporte', icon: '🚛', label: 'Transporte', color: '#F59E0B', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'construcao', icon: '🏗️', label: 'Construção', color: '#D97706', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'energia', icon: '⚡', label: 'Energia', color: '#FBBF24', bg: '#fffbeb', sidebar: '#2e2a1a' },
  { value: 'tecnologia', icon: '💻', label: 'Tecnologia', color: '#3B82F6', bg: '#eff6ff', sidebar: '#1a2a3e' },
  { value: 'educacao', icon: '🎓', label: 'Educação / Formação', color: '#8B5CF6', bg: '#f5f3ff', sidebar: '#1e1a2e' },
  { value: 'saude', icon: '🏥', label: 'Saúde', color: '#DC2626', bg: '#fee2e2', sidebar: '#2e1a1a' },
  { value: 'artesanato', icon: '🎨', label: 'Artesanato', color: '#EC4899', bg: '#fdf2f8', sidebar: '#2e1a24' },

  // ===== INDÚSTRIA =====
  { value: 'textil', icon: '🧵', label: 'Têxtil', color: '#8B5CF6', bg: '#f5f3ff', sidebar: '#1e1a2e' },
  { value: 'madeira', icon: '🪵', label: 'Madeira', color: '#78350F', bg: '#fef3c7', sidebar: '#2e2418' },
  { value: 'metalurgia', icon: '⚙️', label: 'Metalurgia', color: '#525252', bg: '#f5f5f5', sidebar: '#1e1e1e' },
  { value: 'quimica', icon: '🧪', label: 'Indústria Química', color: '#7C3AED', bg: '#f5f3ff', sidebar: '#1e1a2e' },
  { value: 'farmaceutica', icon: '💊', label: 'Farmacêutica', color: '#DC2626', bg: '#fee2e2', sidebar: '#2e1a1a' },
  { value: 'cosmetica', icon: '💄', label: 'Cosmética', color: '#EC4899', bg: '#fdf2f8', sidebar: '#2e1a24' },
  { value: 'papel', icon: '📄', label: 'Indústria do Papel', color: '#78716C', bg: '#f5f5f4', sidebar: '#1e1e1d' },
  { value: 'plastico', icon: '🧴', label: 'Plásticos', color: '#0891B2', bg: '#ecfeff', sidebar: '#1a2a2e' },
  { value: 'reciclagem', icon: '♻️', label: 'Reciclagem', color: '#16A34A', bg: '#f0fdf4', sidebar: '#1a2e1e' },

  // ===== OUTROS =====
  { value: 'floresta', icon: '🌳', label: 'Floresta', color: '#166534', bg: '#f0fdf4', sidebar: '#1a2e1e' },
  { value: 'mineracao', icon: '⛏️', label: 'Mineração', color: '#525252', bg: '#f5f5f5', sidebar: '#1e1e1e' },
  { value: 'imobiliario', icon: '🏘️', label: 'Imobiliário', color: '#0EA5E9', bg: '#f0f9ff', sidebar: '#1a2a3e' },
  { value: 'outro', icon: '📦', label: 'Outro', color: '#6B7280', bg: '#f3f4f6', sidebar: '#1e1e1e' },
];

export function getBusinessIcon(tipo: string) {
  const found = BUSINESS_TYPES.find(t => t.value === tipo);
  return found || {
    icon: '📦',
    label: tipo || 'Outro',
    color: '#6B7280',
    bg: '#f3f4f6',
    sidebar: '#1a1a2e',
  };
}