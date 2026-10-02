'use client';

import { useMemo } from 'react';

import type {
  WebsiteTemplateContent,
  WebsiteTemplateId,
} from '../schema';
import { renderWebsiteTemplateDocument } from '../templates/render-template';

export function WebsiteTemplatePreview(props: {
  templateId: WebsiteTemplateId;
  content: WebsiteTemplateContent;
  assetBaseUrl?: string;
}) {
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
    <iframe
      title="Pré-visualização do website"
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-same-origin allow-popups"
      className="h-[78vh] w-full rounded-lg border bg-white"
    />
  );
}
