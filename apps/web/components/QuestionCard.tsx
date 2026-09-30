'use client';

import type { CSSProperties, ReactNode } from 'react';

interface Palette {
  card: string;
  text: string;
  muted: string;
  border: string;
  input: string;
  accent: string;
  danger: string;
  success: string;
  page: string;
}

interface QuestionCardProps {
  number: string;
  title: string;
  description: string;
  required?: boolean;
  error?: string;
  errorId: string;
  children: ReactNode;
  palette: Palette;
  cardStyle: CSSProperties;
}

export default function QuestionCard({
  number,
  title,
  description,
  required = false,
  error,
  errorId,
  children,
  palette,
  cardStyle,
}: QuestionCardProps) {
  return (
    <section
      style={{
        ...cardStyle,
        marginBottom: '14px',
        padding: '22px 24px 24px',
        borderColor: error ? palette.danger : palette.border,
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span
          aria-hidden="true"
          style={{
            width: '30px',
            height: '30px',
            flex: '0 0 30px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: `${palette.accent}16`,
            color: palette.accent,
            fontSize: '11px',
            fontWeight: 800,
          }}
        >
          {number}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <label
            style={{
              display: 'block',
              color: palette.text,
              fontSize: '15px',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {title}{' '}
            {required && (
              <span aria-label="obrigatório" style={{ color: palette.danger }}>
                *
              </span>
            )}
          </label>
          <p
            style={{
              margin: '5px 0 15px',
              color: palette.muted,
              fontSize: '12px',
              lineHeight: 1.55,
            }}
          >
            {description}
          </p>
          {children}
          {error && (
            <p
              id={errorId}
              style={{
                margin: '8px 0 0',
                color: palette.danger,
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}