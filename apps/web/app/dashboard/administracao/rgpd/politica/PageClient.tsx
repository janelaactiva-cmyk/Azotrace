'use client';

import { useState } from 'react';

export default function PageClient() {
  const [conteudo, setConteudo] = useState('Esta é a política de privacidade da Azotrace. Os dados são tratados de acordo com o RGPD.');
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📄 Política de Privacidade</h2>
      {editing ? (
        <div>
          <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={10} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
          <button onClick={() => { setEditing(false); alert('✅ Política guardada!'); }} style={{ marginTop: '8px', padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Guardar</button>
        </div>
      ) : (
        <div>
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap' }}>{conteudo}</div>
          <button onClick={() => setEditing(true)} style={{ marginTop: '8px', padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✏️ Editar</button>
        </div>
      )}
    </div>
  );
}
