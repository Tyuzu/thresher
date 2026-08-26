export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number = 200): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer !== null) clearTimeout(timer);
    timer = window.setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle<T extends (...args: any[]) => void>(fn: T, delay: number = 200): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer !== null) return;
    timer = window.setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}