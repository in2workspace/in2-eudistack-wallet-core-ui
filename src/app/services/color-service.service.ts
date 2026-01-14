import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ColorService {
  public constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  public applyCustomColors(cssVarMap: Record<string, string>): void {
    const root = this.document.documentElement;

    Object.entries(cssVarMap).forEach(([cssVariable, colorValue]) => {
      root.style.setProperty(cssVariable, colorValue);

      // Set the associated RGB variable, which is used by Ionic
      root.style.setProperty(`${cssVariable}-rgb`, this.toRgbChannels(colorValue));

      // Only compute shade/tint for the "base" colors (not contrasts)
      const isContrast = cssVariable.includes('contrast');
      if (!isContrast) {
        const shade = this.adjustHexLightness(colorValue, -12);
        const tint = this.adjustHexLightness(colorValue, 12);

        root.style.setProperty(`${cssVariable}-shade`, shade);
        root.style.setProperty(`${cssVariable}-tint`, tint);

        root.style.setProperty(`${cssVariable}-shade-rgb`, this.toRgbChannels(shade));
        root.style.setProperty(`${cssVariable}-tint-rgb`, this.toRgbChannels(tint));
      }
    });
  }

  // Returns "r, g, b" (e.g. "0, 173, 211")
  private toRgbChannels(color: string): string {
    const normalized = color.trim().toLowerCase();

    // #RGB / #RRGGBB
    if (normalized.startsWith('#')) {
      return this.hexToRgbChannels(normalized);
    }

    // rgb(...) / rgba(...)
    if (normalized.startsWith('rgb')) {
      return this.rgbFuncToChannels(normalized);
    }

    // Named colors, hsl(...), etc. Resolve through computed style.
    return this.resolveCssColorToRgbChannels(normalized);
  }

  private hexToRgbChannels(hex: string): string {
    const raw = hex.replace('#', '').trim();
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;

    const value = Number.parseInt(full, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;

    return `${r}, ${g}, ${b}`;
  }

  private rgbFuncToChannels(rgbOrRgba: string): string {
    // Accepts: rgb(0, 173, 211) | rgb(0 173 211) | rgba(0,173,211,0.5) | rgb(0 173 211 / 0.5)
    const inside = rgbOrRgba.slice(rgbOrRgba.indexOf('(') + 1, rgbOrRgba.lastIndexOf(')')).trim();
    const [rgbPart] = inside.split('/').map(s => s.trim());

    const parts = rgbPart.includes(',')
      ? rgbPart.split(',').map(s => s.trim())
      : rgbPart.split(/\s+/).map(s => s.trim());

    const r = this.parseRgbChannel(parts[0]);
    const g = this.parseRgbChannel(parts[1]);
    const b = this.parseRgbChannel(parts[2]);

    return `${r}, ${g}, ${b}`;
  }

  private parseRgbChannel(token?: string): number {
    if (!token) return 0;
    const t = token.trim();

    // Percent form: 100% -> 255
    if (t.endsWith('%')) {
      const pct = Number.parseFloat(t.slice(0, -1));
      return this.clamp255(Math.round((pct / 100) * 255));
    }

    return this.clamp255(Math.round(Number.parseFloat(t)));
  }

  private clamp255(n: number): number {
    return Math.min(255, Math.max(0, n));
  }

  private resolveCssColorToRgbChannels(color: string): string {
    const el = this.document.createElement('div');
    el.style.color = color;
    this.document.body.appendChild(el);

    const computed = getComputedStyle(el).color;
    this.document.body.removeChild(el);

    return this.rgbFuncToChannels(computed);
  }

  private adjustHexLightness(color: string, deltaPercent: number): string {
    // Convert input color to RGB channels first
    const { r, g, b } = this.toRgbObject(color);

    // Convert RGB -> HSL
    const { h, s, l } = this.rgbToHsl(r, g, b);

    // Adjust lightness
    const newL = this.clamp01(l + deltaPercent / 100);

    // Convert HSL -> RGB
    const { r: nr, g: ng, b: nb } = this.hslToRgb(h, s, newL);

    // Return hex (Ionic variables.scss usually uses hex for shade/tint)
    return this.rgbToHex(nr, ng, nb);
  }

  private toRgbObject(color: string): { r: number; g: number; b: number } {
    const channels = this.toRgbChannels(color); // "r, g, b"
    const parts = channels.split(',').map(v => Number.parseInt(v.trim(), 10));
    return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const to2 = (n: number) => this.clamp255(Math.round(n)).toString(16).padStart(2, '0');
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = this.clamp255(r) / 255;
    const gn = this.clamp255(g) / 255;
    const bn = this.clamp255(b) / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));

      switch (max) {
        case rn:
          h = ((gn - bn) / d) % 6;
          break;
        case gn:
          h = (bn - rn) / d + 2;
          break;
        default:
          h = (rn - gn) / d + 4;
          break;
      }

      h *= 60;
      if (h < 0) h += 360;
    }

    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rp = 0;
    let gp = 0;
    let bp = 0;

    if (h >= 0 && h < 60) {
      rp = c; gp = x; bp = 0;
    } else if (h < 120) {
      rp = x; gp = c; bp = 0;
    } else if (h < 180) {
      rp = 0; gp = c; bp = x;
    } else if (h < 240) {
      rp = 0; gp = x; bp = c;
    } else if (h < 300) {
      rp = x; gp = 0; bp = c;
    } else {
      rp = c; gp = 0; bp = x;
    }

    return {
      r: (rp + m) * 255,
      g: (gp + m) * 255,
      b: (bp + m) * 255,
    };
  }

  private clamp01(n: number): number {
    return Math.min(1, Math.max(0, n));
  }
}
