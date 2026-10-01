'use client';

import { useMemo, useState } from 'react';

import type {
  WebsiteTemplateContent,
  WebsiteTemplateId,
} from '../schema';
import { renderWebsiteTemplateDocument } from '../templates/render-template';

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: '760px',
  tablet: '820px',
  mobile: '390px',
};

export function WebsiteTemplatePreview(props: {
  templateId: WebsiteTemplateId;
  content: WebsiteTemplateContent;
  assetBaseUrl?: string;
}) {
  const [device, setDevice] = useState<Device>('desktop');

  const srcDoc = useMemo(
    () =>
      renderWebsiteTemplateDocument({
        templateId: props.templateId,
        content: props.content,
        assetBaseUrl: props.assetBaseUrl,
      }),
    [props.templateId, props.content, props.assetBaseUrl],
  );

  return (
    <section data-preview>
      <div data-preview-header>
        <div className="flex items-center gap-3">
          <div data-preview-dots aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Pré-visualização do website</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Pré-visualização do template selecionado</div>
          </div>
        </div>

        <div data-preview-device-switch>
          {([
            ['desktop', 'Desktop', '🖥️'],
            ['tablet', 'Tablet', '📱'],
            ['mobile', 'Mobile', '📲'],
          ] as const).map(([value, label, icon]) => (
            <button
              key={value}
              data-active={device === value ? 'true' : 'false'}
              type="button"
              onClick={() => setDevice(value)}
              className={`rounded-sm px-3 py-1.5 text-[11px] font-semibold transition ${
                device === value
                  ? 'bg-[#2fa8df] text-white dark:bg-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              aria-pressed={device === value}
              title={label}
            >
              <span className="mr-1.5" aria-hidden="true">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div data-preview-stage>
        <div
          data-preview-frame
          style={{ width: DEVICE_WIDTH[device], maxWidth: '100%' }}
        >
          <div data-preview-path>
            <span>{props.templateId.replace('template-', 'Template ')}</span>
            <span>{device}</span>
          </div>
          <iframe
            title="Pré-visualização do website"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="h-[78vh] w-full bg-white"
          />
        </div>
      </div>
    </section>
  );
}
