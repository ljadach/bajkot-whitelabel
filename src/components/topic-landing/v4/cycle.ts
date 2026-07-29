/** Cyclic index step shared by the carousel and the lightbox. */
export function cycle(index: number, delta: number, length: number): number {
  return (index + delta + length) % length;
}
