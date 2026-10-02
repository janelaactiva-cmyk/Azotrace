import * as z from 'zod';

import type { FieldDefinition } from './catalog';

/**
 * Schema usado nos registos de produção.
 * Todas as mensagens são apresentadas em português.
 */
export function buildRecordSchema(fields: FieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    const requiredMessage = `${field.label} é obrigatório.`;
    const invalidMessage = `${field.label}: valor inválido.`;

    if (field.fieldType === 'number') {
      shape[field.key] = z.preprocess(
        (value) => {
          if (value === '' || value == null) return undefined;
          const parsed = Number(String(value).replace(',', '.'));
          return Number.isNaN(parsed) ? value : parsed;
        },
        field.required
          ? z.number({ error: `${field.label}: introduz um número válido.` })
          : z.number({ error: `${field.label}: introduz um número válido.` }).optional(),
      );
      continue;
    }

    if (field.fieldType === 'boolean') {
      shape[field.key] = field.required
        ? z.boolean({ error: requiredMessage })
        : z.boolean({ error: invalidMessage }).optional();
      continue;
    }

    const textSchema = z.string({
      error: field.required ? requiredMessage : invalidMessage,
    });

    shape[field.key] = field.required
      ? textSchema.min(1, requiredMessage)
      : textSchema.optional();
  }

  return z.object(shape);
}
