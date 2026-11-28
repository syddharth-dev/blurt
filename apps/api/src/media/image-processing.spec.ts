import sharp from 'sharp';
import {
  MAX_SIDE,
  PictureRejected,
  processPicture,
  sanitizeSvg,
  sniff,
} from './image-processing.js';

const png = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#5B2EFF' } })
    .png()
    .toBuffer();

describe('sniff (never trust the client’s file type)', () => {
  it('reads the real type from the bytes', async () => {
    expect(sniff(await png(4, 4))).toBe('png');
    expect(
      sniff(
        await sharp(await png(4, 4))
          .jpeg()
          .toBuffer(),
      ),
    ).toBe('jpeg');
    expect(
      sniff(
        await sharp(await png(4, 4))
          .webp()
          .toBuffer(),
      ),
    ).toBe('webp');
    expect(sniff(Buffer.from('﻿<?xml version="1.0"?>\n<!-- hi --><svg viewBox="0 0 1 1"/>'))).toBe(
      'svg',
    );
  });

  it('rejects anything else, whatever it was called', () => {
    expect(sniff(Buffer.from('GIF89a......'))).toBeNull();
    expect(sniff(Buffer.from('<html><svg></svg></html>'))).toBeNull();
    expect(sniff(Buffer.from('%PDF-1.7'))).toBeNull();
  });
});

describe('sanitizeSvg', () => {
  it('removes scripts, handlers, foreignObject and outside links', () => {
    const out = sanitizeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
        <script>alert(1)</script>
        <foreignObject><iframe src="https://evil.test"/></foreignObject>
        <image href="file:///etc/passwd"/>
        <image xlink:href='https://evil.test/x.png'/>
        <use href="#ok"/>
        <rect style="fill:url(https://evil.test/a)" fill="url(#grad)"/>
        <style>@import url(https://evil.test/s.css);</style>
      </svg>`,
    );
    expect(out).not.toMatch(/script|onload|foreignObject|passwd|evil\.test|@import/i);
    expect(out).toContain('href="#ok"');
    expect(out).toContain('url(#grad)');
  });

  it('refuses a DOCTYPE (XXE, billion laughs)', () => {
    expect(() =>
      sanitizeSvg('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>'),
    ).toThrow(PictureRejected);
  });
});

describe('processPicture', () => {
  it('turns a big PNG into a WebP of at most 1600 px plus a thumbnail', async () => {
    const out = await processPicture(await png(3200, 1600));
    expect(sniff(out.webp)).toBe('webp');
    expect(sniff(out.thumb)).toBe('webp');
    expect([out.width, out.height]).toEqual([MAX_SIDE, 800]);
    expect((await sharp(out.thumb).metadata()).width).toBe(320);
  });

  it('drops EXIF metadata (location included)', async () => {
    const withExif = await sharp(await png(50, 50))
      .jpeg()
      .withExif({ IFD0: { Artist: 'Teacher', Copyright: 'GPS 14.6,121.0' } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const out = await processPicture(withExif);
    expect((await sharp(out.webp).metadata()).exif).toBeUndefined();
  });

  it('rasterizes a sanitized SVG to WebP', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><script>x</script><rect width="200" height="100" fill="#FFC93C"/></svg>',
    );
    const out = await processPicture(svg);
    expect(out.type).toBe('svg');
    expect(sniff(out.webp)).toBe('webp');
    expect(out.width / out.height).toBeCloseTo(2, 1);
  });

  it('rejects files that lie about their type, empty files and huge files', async () => {
    await expect(processPicture(Buffer.from('not a picture'))).rejects.toThrow(PictureRejected);
    await expect(processPicture(Buffer.alloc(0))).rejects.toThrow(PictureRejected);
    await expect(processPicture(Buffer.alloc(6 * 1024 * 1024, 1))).rejects.toThrow(PictureRejected);
    // A PNG header with garbage after it
    const broken = Buffer.concat([(await png(4, 4)).subarray(0, 16), Buffer.alloc(64)]);
    await expect(processPicture(broken)).rejects.toThrow(PictureRejected);
  });
});
