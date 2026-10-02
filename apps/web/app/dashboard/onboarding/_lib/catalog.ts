export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'boolean'
  | 'image';

export type FieldDefinition = {
  key: string;
  label: string;
  fieldType: FieldType;
  unit?: string;
  required: boolean;
  public: boolean;
  options?: string[];
};

export type ProducerPreset = {
  id: string;
  label: string;
  icon: string;
  example: string;
  defaultProductType: string;
  unitLabel: string;
  unitPrefix: string;
  defaultColor: string;
  fields: FieldDefinition[];
  stages: string[];
};

const commonObservation: FieldDefinition = {
  key: 'observacoes',
  label: 'Observações',
  fieldType: 'textarea',
  required: false,
  public: false,
};

export const PRODUCER_PRESETS: ProducerPreset[] = [
  {
    id: 'agriculture',
    label: 'Agricultura',
    icon: '🌱',
    example: 'Ananás, hortícolas, fruta',
    defaultProductType: 'Ananás',
    unitLabel: 'Estufa',
    unitPrefix: 'EST',
    defaultColor: '#47B37D',
    fields: [
      { key: 'data_plantacao', label: 'Data de plantação', fieldType: 'date', required: true, public: true },
      { key: 'data_colheita', label: 'Data de colheita', fieldType: 'date', required: false, public: true },
      { key: 'temperatura', label: 'Temperatura', fieldType: 'number', unit: '°C', required: false, public: true },
      { key: 'humidade', label: 'Humidade', fieldType: 'number', unit: '%', required: false, public: true },
      { key: 'quantidade', label: 'Quantidade', fieldType: 'number', unit: 'un.', required: false, public: true },
      { key: 'foto', label: 'Foto', fieldType: 'image', required: false, public: true },
      commonObservation,
    ],
    stages: ['Plantação', 'Crescimento', 'Controlo', 'Colheita', 'Embalamento', 'Expedição'],
  },
  {
    id: 'apiculture',
    label: 'Apicultura',
    icon: '🍯',
    example: 'Mel e produtos apícolas',
    defaultProductType: 'Mel',
    unitLabel: 'Colmeia',
    unitPrefix: 'COL',
    defaultColor: '#D99A24',
    fields: [
      { key: 'data_extracao', label: 'Data de extração', fieldType: 'date', required: true, public: true },
      { key: 'tipo_flor', label: 'Tipo de flor', fieldType: 'text', required: false, public: true },
      { key: 'humidade', label: 'Humidade', fieldType: 'number', unit: '%', required: false, public: true },
      { key: 'quantidade', label: 'Quantidade', fieldType: 'number', unit: 'kg', required: false, public: true },
      { key: 'foto', label: 'Foto', fieldType: 'image', required: false, public: true },
      commonObservation,
    ],
    stages: ['Produção', 'Recolha', 'Extração', 'Filtragem', 'Embalamento'],
  },
  {
    id: 'wine',
    label: 'Vinho',
    icon: '🍇',
    example: 'Vinhas, cubas e pipas',
    defaultProductType: 'Vinho',
    unitLabel: 'Pipa',
    unitPrefix: 'PIP',
    defaultColor: '#7C3AED',
    fields: [
      { key: 'casta', label: 'Casta', fieldType: 'text', required: true, public: true },
      { key: 'vindima', label: 'Data da vindima', fieldType: 'date', required: false, public: true },
      { key: 'teor_alcoolico', label: 'Teor alcoólico', fieldType: 'number', unit: '%', required: false, public: true },
      { key: 'temperatura', label: 'Temperatura', fieldType: 'number', unit: '°C', required: false, public: false },
      { key: 'quantidade', label: 'Quantidade', fieldType: 'number', unit: 'L', required: false, public: true },
      commonObservation,
    ],
    stages: ['Vindima', 'Prensagem', 'Fermentação', 'Envelhecimento', 'Engarrafamento'],
  },
  {
    id: 'meat',
    label: 'Carne',
    icon: '🥩',
    example: 'Explorações e grupos de animais',
    defaultProductType: 'Carne',
    unitLabel: 'Grupo',
    unitPrefix: 'GRP',
    defaultColor: '#DC5A5A',
    fields: [
      { key: 'especie', label: 'Espécie', fieldType: 'text', required: true, public: true },
      { key: 'raca', label: 'Raça', fieldType: 'text', required: false, public: true },
      { key: 'data_abate', label: 'Data de abate', fieldType: 'date', required: false, public: true },
      { key: 'peso', label: 'Peso', fieldType: 'number', unit: 'kg', required: false, public: true },
      { key: 'matadouro', label: 'Matadouro', fieldType: 'text', required: false, public: true },
      commonObservation,
    ],
    stages: ['Criação', 'Alimentação', 'Transporte', 'Abate', 'Processamento', 'Embalamento'],
  },
  {
    id: 'dairy',
    label: 'Lacticínios',
    icon: '🧀',
    example: 'Leite e queijo',
    defaultProductType: 'Queijo',
    unitLabel: 'Cuba',
    unitPrefix: 'CUB',
    defaultColor: '#3182CE',
    fields: [
      { key: 'data_producao', label: 'Data de produção', fieldType: 'date', required: true, public: true },
      { key: 'tipo_leite', label: 'Tipo de leite', fieldType: 'text', required: false, public: true },
      { key: 'temperatura', label: 'Temperatura', fieldType: 'number', unit: '°C', required: false, public: false },
      { key: 'quantidade', label: 'Quantidade', fieldType: 'number', unit: 'kg', required: false, public: true },
      commonObservation,
    ],
    stages: ['Receção', 'Preparação', 'Coagulação', 'Maturação', 'Embalamento'],
  },
  {
    id: 'fish',
    label: 'Pesca',
    icon: '🐟',
    example: 'Peixe e aquicultura',
    defaultProductType: 'Peixe',
    unitLabel: 'Zona',
    unitPrefix: 'ZON',
    defaultColor: '#0F9D8A',
    fields: [
      { key: 'data_captura', label: 'Data de captura', fieldType: 'date', required: true, public: true },
      { key: 'especie', label: 'Espécie', fieldType: 'text', required: true, public: true },
      { key: 'peso', label: 'Peso', fieldType: 'number', unit: 'kg', required: false, public: true },
      { key: 'temperatura', label: 'Temperatura', fieldType: 'number', unit: '°C', required: false, public: false },
      commonObservation,
    ],
    stages: ['Captura', 'Seleção', 'Conservação', 'Processamento', 'Expedição'],
  },
  {
    id: 'custom',
    label: 'Outro',
    icon: '➕',
    example: 'Criar configuração personalizada',
    defaultProductType: '',
    unitLabel: 'Unidade',
    unitPrefix: 'UND',
    defaultColor: '#64748B',
    fields: [commonObservation],
    stages: ['Produção', 'Validação', 'Finalização'],
  },
];

export function getPreset(id: string) {
  return PRODUCER_PRESETS.find((preset) => preset.id === id) ?? PRODUCER_PRESETS[0]!;
}
