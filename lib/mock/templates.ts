import type { PostType, SlideBlockKind, TemplateId } from "./types";

export type SlideField = { name: string; limit: number };
export type SlideBlockDef = { label: string; canvasClass: string; fields: SlideField[] };

// Satu sumber kebenaran batas karakter per slot, lihat design.md §7.3.
// TODO: pindah ke lib/render/registry.ts saat pipeline Satori dibangun (Fase 2) —
// dipakai bersama untuk generate prompt LLM, validasi Zod, dan render, bukan didata di dua tempat.
export const BLOCKS: Record<SlideBlockKind, SlideBlockDef> = {
  cover: {
    label: "Cover",
    canvasClass: "slide__canvas--cover",
    fields: [
      { name: "eyebrow", limit: 20 },
      { name: "title", limit: 60 },
      { name: "subtitle", limit: 90 },
    ],
  },
  point: {
    label: "Point",
    canvasClass: "slide__canvas--point",
    fields: [
      { name: "index", limit: 2 },
      { name: "heading", limit: 45 },
      { name: "body", limit: 160 },
    ],
  },
  quote: {
    label: "Quote",
    canvasClass: "slide__canvas--point",
    fields: [
      { name: "quote", limit: 140 },
      { name: "attribution", limit: 40 },
    ],
  },
  cta: {
    label: "CTA",
    canvasClass: "slide__canvas--cta",
    fields: [
      { name: "headline", limit: 50 },
      { name: "handle", limit: 30 },
    ],
  },
};

export type TemplateExampleSlide =
  | { block: "cover"; eyebrow: string; title: string; subtitle: string }
  | { block: "point"; index: string; heading: string; body: string }
  | { block: "quote"; quote: string; attribution: string }
  | { block: "cta"; headline: string; handle: string };

export type TemplateDef = {
  id: TemplateId;
  name: string;
  kind: PostType;
  desc: string;
  blocks: SlideBlockKind[];
  example: TemplateExampleSlide[];
};

// TODO: ganti ke query registry via lib/render/registry.ts setelah pipeline render dibangun.
export const TEMPLATES: TemplateDef[] = [
  {
    id: "cover_list",
    name: "Cover + List",
    kind: "carousel",
    desc: "Slide pembuka lalu poin bernomor, ditutup ajakan bertindak. Cocok untuk listicle atau langkah-langkah.",
    blocks: ["cover", "point", "point", "cta"],
    example: [
      {
        block: "cover",
        eyebrow: "Panduan",
        title: "5 kesalahan freelancer pemula",
        subtitle: "Yang bikin kamu kerja keras tapi tetap kere",
      },
      {
        block: "point",
        index: "01",
        heading: "Pasang harga dari rasa takut",
        body: "Kamu banting harga karena takut ditolak. Klien yang datang justru paling banyak menuntut.",
      },
      {
        block: "point",
        index: "02",
        heading: "Kerja tanpa kontrak",
        body: "Chat WhatsApp bukan kesepakatan. Satu halaman scope dan termin sudah cukup melindungi.",
      },
      {
        block: "cta",
        headline: "Mana yang paling sering kamu lakukan?",
        handle: "@kelasfreelance.id",
      },
    ],
  },
  {
    id: "point_grid",
    name: "Point Grid",
    kind: "carousel",
    desc: "Langsung ke isi tanpa slide cover terpisah. Dipakai kalau judulnya sendiri sudah cukup jelas dari caption.",
    blocks: ["point", "point", "point"],
    example: [
      {
        block: "point",
        index: "01",
        heading: "Kirim brief sebelum call",
        body: "Klien yang belum siap brief biasanya belum siap budget juga.",
      },
      {
        block: "point",
        index: "02",
        heading: "Kunci scope di email",
        body: "Verbal gampang berubah pikiran. Tulisan jadi rujukan kalau ada dispute.",
      },
      {
        block: "point",
        index: "03",
        heading: "Minta feedback tertulis",
        body: "Revisi lisan gampang membengkak tanpa terasa.",
      },
    ],
  },
  {
    id: "quote",
    name: "Quote",
    kind: "single",
    desc: "Satu kutipan atau pernyataan tunggal dengan atribusi kecil. Untuk post reflektif, bukan listicle.",
    blocks: ["quote"],
    example: [
      {
        block: "quote",
        quote: "Kalau kalender kamu penuh tiga bulan ke depan, itu sinyal waktunya naikin harga.",
        attribution: "@kelasfreelance.id",
      },
    ],
  },
  {
    id: "cta_only",
    name: "CTA Only",
    kind: "single",
    desc: "Satu slide ajakan bertindak. Untuk pengumuman, promosi, atau penutup rangkaian konten.",
    blocks: ["cta"],
    example: [
      {
        block: "cta",
        headline: "Kelas baru dibuka minggu depan",
        handle: "@kelasfreelance.id",
      },
    ],
  },
];
