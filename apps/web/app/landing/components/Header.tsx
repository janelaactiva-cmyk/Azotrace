'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header({ isDark, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <header style={{
      background: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#333',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      padding: '12px 0',
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ width: '100px' }}></div>

          <nav style={{ display: 'none', gap: '24px', alignItems: 'center' }} className="desktop-nav">
            <a href="#home" style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Início</a>
            <a href="#about" style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>A Nossa Essência</a>
            <a href="#vantagens" style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Vantagens</a>
            <a href="#feature" style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Como Funciona</a>
            <a href="#pricing" style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Preço</a>
            <a href="#faq" style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>FAQ</a>
            <a href="#contact" style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Contactos</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Botão Entrar */}
            <Link 
              href="/login"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                padding: '8px 24px',
                border: '2px solid #234D87',
                borderRadius: '8px',
                backgroundColor: isHovered ? '#234D87' : (isDark ? '#111827' : '#FFFFFF'),
                color: isHovered ? '#FFFFFF' : '#234D87',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'background-color 0.3s ease, color 0.3s ease',
                cursor: 'pointer',
                display: 'inline-block'
              }}
              className="desktop-nav"
            >
              Entrar
            </Link>

            {/* Botão de Tema (Sol/Lua) AO LADO do Botão Entrar */}
            <button
              onClick={toggleTheme}
              style={{
                background: isDark ? '#374151' : '#f3f4f6',
                color: isDark ? '#fbbf24' : '#1f2937',
                border: '1px solid #d1d5db',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
              title="Alternar Modo Claro/Escuro"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: isDark ? '#f3f4f6' : '#234D87',
                marginLeft: '6px'
              }}
              className="hamburger"
            >
              ☰
            </button>
          </div>
        </div>

        {isOpen && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px 0',
            borderTop: '1px solid #eee',
            marginTop: '12px'
          }}>
            <a href="#home" onClick={() => setIsOpen(false)} style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Início</a>
            <a href="#about" onClick={() => setIsOpen(false)} style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>A Nossa Essência</a>
            <a href="#vantagens" onClick={() => setIsOpen(false)} style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Vantagens</a>
            <a href="#feature" onClick={() => setIsOpen(false)} style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Como Funciona</a>
            <a href="#pricing" onClick={() => setIsOpen(false)} style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Preço</a>
            <a href="#faq" onClick={() => setIsOpen(false)} style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>FAQ</a>
            <a href="#contact" onClick={() => setIsOpen(false)} style={{ color: isDark ? '#f3f4f6' : '#234D87', textDecoration: 'none', fontWeight: '500' }}>Contactos</a>
            <Link href="/login" onClick={() => setIsOpen(false)} style={{
              padding: '10px 24px',
              border: '2px solid #234D87',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#234D87',
              textDecoration: 'none',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Entrar
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .hamburger { display: none !important; }
          .desktop-nav { display: flex !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </header>
  );
}