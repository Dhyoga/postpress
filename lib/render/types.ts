import type { ReactElement } from "react";

export type SlideContent = Record<string, string>;

export type TemplateMeta = {
  id: string;
  name: string;
  slots: Record<string, { max: number }>;
};

export type Template = {
  meta: TemplateMeta;
  element: (content: SlideContent) => ReactElement;
};
