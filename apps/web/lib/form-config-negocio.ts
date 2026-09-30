import { z } from 'zod';

export type FieldType = 'text' | 'number' | 'email' | 'select' | 'textarea' | 'checkbox';

export interface FieldConfig {
  name: string;
  number: string;
  title: string;
  description: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  suffix?: string;
  options?: { label: string; value: string }[]; // para 'select'
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export const NEGOCIO_FIELDS: FieldConfig[] = [
  // ... manter os que já tem (nome, tipo, quantidade)
];

export function buildZodSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === 'checkbox') {
      shape[field.name] = z.boolean().optional();
      continue;
    }

    if (field.type === 'number') {
      let numSchema = z
        .string()
        .transform((val) => (val.trim() === '' ? null : Number(val.replace(',', '.'))))
        .refine(
          (val) =>
            val === null ||
            (Number.isFinite(val) &&
              (field.min === undefined || val >= field.min) &&
              (field.max === undefined || val <= field.max)),
          { message: `Introduz um valor válido.` }
        );
      if (!field.required) numSchema = numSchema.optional() as any;
      shape[field.name] = numSchema;
      continue;
    }

    let strSchema = z.string();

    if (field.type === 'email' && field.required) {
      strSchema = strSchema.email({ message: 'Email inválido.' });
    }

    if (field.required) {
      strSchema = strSchema.min(1, { message: `Indica ${field.title.toLowerCase()}.` });
    }
    if (field.minLength) {
      strSchema = strSchema.min(field.minLength, { message: `Mínimo de ${field.minLength} caracteres.` });
    }
    if (field.maxLength) {
      strSchema = strSchema.max(field.maxLength, { message: `Máximo de ${field.maxLength} caracteres.` });
    }
    if (!field.required) {
      strSchema = strSchema.optional().or(z.literal('')) as any;
    }

    shape[field.name] = strSchema;
  }

  return z.object(shape);
}