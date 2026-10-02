'use client';

import { Button } from '@kit/ui/button';

import type { WebsiteTemplateId } from '../schema';
import { WEBSITE_TEMPLATE_REGISTRY } from '../templates/registry';

export function WebsiteTemplatePicker(props: {
  value: WebsiteTemplateId;
  onChange: (value: WebsiteTemplateId) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(Object.values(WEBSITE_TEMPLATE_REGISTRY) as Array<
        (typeof WEBSITE_TEMPLATE_REGISTRY)[WebsiteTemplateId]
      >).map((template) => {
        const selected = template.id === props.value;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => props.onChange(template.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selected
                ? 'border-primary ring-primary/20 ring-2'
                : 'hover:bg-muted/50'
            }`}
          >
            <div className="font-semibold">{template.name}</div>
            <p className="text-muted-foreground mt-1 text-sm">
              {template.description}
            </p>
            <Button
              type="button"
              variant={selected ? 'default' : 'outline'}
              size="sm"
              className="mt-3 pointer-events-none"
            >
              {selected ? 'Selecionado' : 'Escolher'}
            </Button>
          </button>
        );
      })}
    </div>
  );
}
