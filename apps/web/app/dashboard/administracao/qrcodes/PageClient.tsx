'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yzfyoboxiwvppbeptp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6ZnlvYm94aXd2cHBiZXBpcHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjE2MTIsImV4cCI6MjEwMTQ5NzYxMn0.B8T29WNNN7VQY-5WGUatf4vkpBvhGQb0Gl4XpXT5wk4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface NegocioItem {
  id: string;
  nome: string;
  tipo: string;
  humidade?: number | null;
  origem?: string;
  temperatura?: number | null;
  validade?: string;
  quantidade?: number | null;
  observacoes?: string;
  created_at: string;
}

// Definição dos campos disponíveis para configurar
interface FieldConfig {
  key: keyof NegocioItem;
  label: string;
}

const AVAILABLE_FIELDS: FieldConfig[] = [
  { key: 'nome', label: 'Nome / Produto' },
  { key: 'tipo', label: 'Tipo / Categoria' },
  { key: 'origem', label: 'Origem / Produtor' },
  { key: 'quantidade', label: 'Quantidade' },
  { key: 'validade', label: 'Validade' },
  { key: 'humidade', label: 'Humidade' },
  { key: 'temperatura', label: 'Temperatura' },
  { key: 'observacoes', label: 'Observações' },
];

export default function PageClient() {
  const [negocios, setNegocios] = useState<NegocioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProductForModal, setSelectedProductForModal] = useState<NegocioItem | null>(null);

  // Estados dos Checkboxes para o Website
  const [websiteFields, setWebsiteFields] = useState<Record<string, boolean>>({
    nome: true,
    tipo: true,
    origem: true,
    quantidade: true,
    validade: true,
    humidade: true,
    temperatura: true,
    observacoes: true,
  });

  // Estados dos Checkboxes para o QR Code
  const [qrFields, setQrFields] = useState<Record<string, boolean>>({
    nome: true,
    tipo: true,
    origem: true,
    validade: true,
    temperatura: true,
    quantidade: false,
    humidade: false,
    observacoes: false,
  });

  useEffect(() => {
    const fetchNegocios = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('negocios')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar negócios:', error.message);
        } else if (data) {
          setNegocios(data);
        }
      } catch (err) {
        console.error('Erro crítico:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNegocios();
  }, []);

  const filteredNegocios = negocios.filter(item => 
    (item.nome && item.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.tipo && item.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.origem && item.origem.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Alternar checkbox do website
  const toggleWebsiteField = (key: string) => {
    setWebsiteFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Alternar checkbox do QR code
  const toggleQrField = (key: string) => {
    setQrFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Gera dinamicamente o objeto/JSON apenas com os campos selecionados para o QR Code
  const generateCustomQrPayload = (item: NegocioItem) => {
    const payloadData: Record<string, any> = { id: item.id };
    
    AVAILABLE_FIELDS.forEach(field => {
      if (qrFields[field.key] && item[field.key] !== null && item[field.key] !== undefined) {
        payloadData[field.key] = item[field.key];
      }
    });

    return JSON.stringify(payloadData);
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280', fontSize: '15px' }}>A carregar dados...</div>;
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Título Principal */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          ⚙️ Configuração Dinâmica de Campos (Website vs QR Code)
        </h2>
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
          Utiliza as caixas de seleção abaixo para escolher em tempo real quais os dados exibidos no site e quais os codificados no QR Code.
        </p>
      </div>

      {/* PAINEL DE CHECKBOXES DE CONFIGURAÇÃO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Caixa de Controlo para o Website */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginTop: 0, marginBottom: '10px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
            🖥️ Campos Visíveis no Website
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {AVAILABLE_FIELDS.map(field => (
              <label key={`web-${field.key}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!websiteFields[field.key]}
                  onChange={() => toggleWebsiteField(field.key)}
                  style={{ accentColor: '#2563eb', width: '15px', height: '15px' }}
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

        {/* Caixa de Controlo para o QR Code */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginTop: 0, marginBottom: '10px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
            📱 Campos Codificados no QR Code
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {AVAILABLE_FIELDS.map(field => (
              <label key={`qr-${field.key}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!qrFields[field.key]}
                  onChange={() => toggleQrField(field.key)}
                  style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

      </div>

      {/* Barra de Pesquisa */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <input
          type="text"
          placeholder="Pesquisar produto, tipo ou origem..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            color: '#111827',
            fontSize: '13px',
            width: '300px',
            outline: 'none'
          }}
        />
      </div>

      {/* Tabela de Negócios Dinâmica */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px' }}>QR Code (Customizado)</th>
                {websiteFields.nome && <th style={{ padding: '12px 16px' }}>Produto</th>}
                {websiteFields.tipo && <th style={{ padding: '12px 16px' }}>Tipo</th>}
                {websiteFields.origem && <th style={{ padding: '12px 16px' }}>Origem</th>}
                {(websiteFields.quantidade || websiteFields.validade) && <th style={{ padding: '12px 16px' }}>Stock / Validade</th>}
                {(websiteFields.humidade || websiteFields.temperatura) && <th style={{ padding: '12px 16px' }}>Parâmetros</th>}
                {websiteFields.observacoes && <th style={{ padding: '12px 16px' }}>Observações</th>}
                <th style={{ padding: '12px 16px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredNegocios.length > 0 ? (
                filteredNegocios.map((item) => {
                  const customPayload = generateCustomQrPayload(item);
                  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(customPayload)}`;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', color: '#111827' }}>
                      <td style={{ padding: '12px 16px', width: '90px', verticalAlign: 'middle' }}>
                        <div style={{ background: '#ffffff', padding: '4px', border: '1px solid #e5e7eb', borderRadius: '6px', display: 'inline-block' }}>
                          <img
                            src={qrImageUrl}
                            alt={`QR Code ${item.nome}`}
                            width={60}
                            height={60}
                            style={{ display: 'block', borderRadius: '4px' }}
                          />
                        </div>
                      </td>

                      {websiteFields.nome && (
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#2563eb' }}>
                          {item.nome}
                        </td>
                      )}

                      {websiteFields.tipo && (
                        <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                            {item.tipo || 'Geral'}
                          </span>
                        </td>
                      )}

                      {websiteFields.origem && (
                        <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                          {item.origem || 'N/D'}
                        </td>
                      )}

                      {(websiteFields.quantidade || websiteFields.validade) && (
                        <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                          {websiteFields.quantidade && <div>Stock: <strong>{item.quantidade ?? 'N/D'}</strong></div>}
                          {websiteFields.validade && <div style={{ color: '#6b7280' }}>Val: {item.validade ? item.validade.split('T')[0] : 'N/D'}</div>}
                        </td>
                      )}

                      {(websiteFields.humidade || websiteFields.temperatura) && (
                        <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace' }}>
                          {websiteFields.humidade && <div>Hum: {item.humidade ?? '-'}%</div>}
                          {websiteFields.temperatura && <div>Temp: {item.temperatura ?? '-'}°C</div>}
                        </td>
                      )}

                      {websiteFields.observacoes && (
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                          {item.observacoes || 'Sem observações'}
                        </td>
                      )}

                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => setSelectedProductForModal(item)}
                          style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          Ver QR Code
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhe e Inspeção do Payload do QR Code */}
      {selectedProductForModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', padding: '30px', borderRadius: '12px', width: '450px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>{selectedProductForModal.nome}</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>QR Code gerado com base nas checkboxes ativas para o QR:</p>
            
            <div style={{ margin: '0 auto', padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'inline-block' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generateCustomQrPayload(selectedProductForModal))}`}
                alt="QR Code Customizado"
                width={160}
                height={160}
              />
            </div>

            <div style={{ fontSize: '12px', textAlign: 'left', background: '#f3f4f6', padding: '12px', borderRadius: '6px', color: '#374151', fontFamily: 'monospace', maxHeight: '120px', overflowY: 'auto' }}>
              <strong>Conteúdo exato codificado no QR:</strong>
              <pre style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{generateCustomQrPayload(selectedProductForModal)}</pre>
            </div>

            <button
              onClick={() => setSelectedProductForModal(null)}
              style={{ padding: '10px', background: '#374151', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}