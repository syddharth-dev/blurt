/**
 * Picture processing (AGENTS.md rule 10, TEACHER_DASHBOARD.md → "What happens when a teacher
 * uploads a picture"). The client's file name and type are never trusted: the real type comes
 * from the file's first bytes.
 *
 * Every picture comes out as WebP (max 1600 px, plus a 320 px thumbnail) with all metadata
 * dropped (sharp writes none unless asked, so EXIF and GPS are gone). SVGs are sanitized and
 * then rasterized, so no SVG is ever served: there is nothing left to run.
 */
import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_SIDE = 1600;
export const THUMB_SIDE = 320;

export type SniffedType = 'png' | 'jpeg' | 'webp' | 'svg';

export const CONTENT_TYPES: Record<SniffedType, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export class PictureRejected extends Error {}

/** The file's real type from its first bytes, or null if it isn't a picture we accept. */
export function sniff(buf: Buffer): SniffedType | null {
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'webp';
  // SVG is text: optional BOM, whitespace, XML declaration or comments, then <svg.
  const head = buf.subarray(0, 4096).toString('utf8').replace(/^﻿/, '');
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

/**
 * Makes an SVG safe to rasterize. Refuses anything with a DOCTYPE (entity tricks such as XXE and
 * "billion laughs"), then removes scripts, foreignObject, event handlers, and any link that
 * isn't to a part of the same file or an embedded bitmap (no external or local files).
 */
export function sanitizeSvg(svg: string): string {
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) throw new PictureRejected('SVG with a DOCTYPE');
  const safeRef = (v: string) => /^#|^data:image\/(png|jpe?g|webp);base64,/i.test(v.trim());
  return (
    svg
      .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script[^>]*\/>/gi, '')
      .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
      .replace(/<foreignObject[^>]*\/>/gi, '')
      .replace(/<\?xml-stylesheet[^>]*>/gi, '')
      // on*="…" handlers, quoted or not
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      // href / xlink:href to anything but #id or an embedded bitmap
      .replace(/\s(xlink:)?href\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, _x, _q, d, s) =>
        safeRef((d ?? s) as string) ? m : '',
      )
      // url(...) in styles and attributes, except url(#id)
      .replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, 'none')
      // @import in <style>
      .replace(/@import[^;]*;?/gi, '')
  );
}

export type ProcessedPicture = {
  webp: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  /** What the file really was. */
  type: SniffedType;
};

export async function processPicture(input: Buffer): Promise<ProcessedPicture> {
  if (input.length === 0) throw new PictureRejected('empty file');
  if (input.length > MAX_UPLOAD_BYTES) throw new PictureRejected('file over 5 MB');
  const type = sniff(input);
  if (!type) throw new PictureRejected('not a PNG, JPG, WebP or SVG');

  const source = type === 'svg' ? Buffer.from(sanitizeSvg(input.toString('utf8')), 'utf8') : input;
  // limitInputPixels guards against decompression bombs; density makes small SVGs crisp.
  const open = () =>
    sharp(source, {
      limitInputPixels: 50_000_000,
      ...(type === 'svg' ? { density: 300 } : {}),
    }).rotate(); // apply EXIF orientation before the metadata is dropped

  try {
    const { data: webp, info } = await open()
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: type !== 'svg',
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await open()
      .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    return { webp, thumb, width: info.width, height: info.height, type };
  } catch (err) {
    if (err instanceof PictureRejected) throw err;
    throw new PictureRejected(`unreadable ${type}: ${(err as Error).message}`);
  }
}
