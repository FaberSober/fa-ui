/*
 * A collection of array utils
 */

/**
 * find the closest item index in arr. (distance is calculated by distanceFunc)
 * @param arr
 * @param distanceFunc
 */
export function findClosestIndex<T>(arr: T[], distanceFunc: (i: T) => number) {
  let index = -1;
  let minGap = null;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const gap = distanceFunc(item);
    if (minGap === null || gap < minGap) {
      minGap = gap;
      index = i;
    }
  }
  return index;
}

/**
 * 只修改原数组并返回它自身
 * @param arr
 * @param start
 * @param deleteCount
 * @param items
 */
export function spliceAndReturnSelf<T>(
  arr: T[],
  start: number,
  deleteCount: number = 1, // 默认删除 1 个
...items: T[]
): T[] {
  arr.splice(start, deleteCount, ...items);
  return arr;
}

