/**
 * Removes tiny decimal noise such as 0.09999999999999964 so results read as 0.1.
 *
 * This matters for comparisons: (7.0 - 6.7) / 0.1 is 2.999999999999998 in a computer,
 * which would wrongly count as "less than 3". Cleaning it first gives exactly 3.
 */
export function clean(n: number): number {
  return Number(n.toFixed(10));
}
