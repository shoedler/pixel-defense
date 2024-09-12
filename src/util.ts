export const elementDimensions = (element: HTMLElement): { width: number; height: number } => {
  let { height, width } = element.getBoundingClientRect(); // Includes padding and border

  const { marginTop, marginBottom, marginLeft, marginRight } = getComputedStyle(element);

  height += parseInt(marginTop) + parseInt(marginBottom);
  width += parseInt(marginLeft) + parseInt(marginRight);

  return { width, height };
};
