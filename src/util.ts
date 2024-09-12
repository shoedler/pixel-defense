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
