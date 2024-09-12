import { Color } from "./engine";

/**
 * Returns the dimensions of an element, including padding, border, and margin.
 * @param element The element to get the dimensions of
 * @returns
 */
export const elementDimensions = (element: HTMLElement): { width: number; height: number } => {
  let { height, width } = element.getBoundingClientRect(); // Includes padding and border

  const { marginTop, marginBottom, marginLeft, marginRight } = getComputedStyle(element);

  height += parseInt(marginTop) + parseInt(marginBottom);
  width += parseInt(marginLeft) + parseInt(marginRight);

  return { width, height };
};

/**
 * Returns a function that will only call the original function once every `delayMs` milliseconds.
 * @param fn The function to make idempotent
 * @param delayMs The delay in milliseconds
 */
export const idempotent = <T extends Function>(delayMs: number, fn: T): T => {
  let lastCall = 0;
  return ((...args: any) => {
    if (performance.now() - lastCall > delayMs) {
      lastCall = performance.now();
      fn(...args);
    }
  }) as any;
};

/**
 * Converts an HSL color value to RGB. Conversion formula adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and returns r, g, and b in the set [0, 255].
 * @param h The hue
 * @param s The saturation
 * @param l The lightness
 */
export const hslToRgb = (h: number, s: number, l: number): Color => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const hueToRgb = (p: number, q: number, t: number) => {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
};
