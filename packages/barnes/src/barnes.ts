/* tslint:disable:unified-signatures */

import ams from 'async-merge-sort';

export enum Plugin {
  ALL = 'all',
  COUNT = 'count',
  FILTER = 'filter',
  FIND = 'find',
  FIND_LAST = 'findLast',
  FROM = 'from',
  FOR_EACH = 'forEach',
  FOR_EACH_SERIES = 'forEachSeries',
  MAP = 'map',
  MAP_SERIES = 'mapSeries',
  MAX = 'max',
  MIN = 'min',
  REDUCE = 'reduce',
  REDUCE_RIGHT = 'reduceRight',
  SORT = 'sort',
  TAKE = 'take',
  TAKE_LAST = 'takeLast',
  TAKE_UNTIL = 'takeUntil',
  TAKE_WHILE = 'takeWhile',
  TAP = 'tap'
}

export type BarnesFn<I, O> = (
  file: I,
  files: I[],
  barnes: Barnes<I>
) => Promise<O> | O;

export type Useable<I, O> =
  | BarnesPlugin<SomeKindaFunction<I, O>>
  | BatchFn<I, O>
  | Barnes<O>;
export type MapFn<I, O> = BarnesFn<I, O>;
export type ForEachFn<I> = BarnesFn<I, void>;
export type FilterFn<I> = BarnesFn<I, boolean>;

export type BatchFn<I, O> = (
  files: I[],
  barnes: Barnes<I>
) => O[] | Promise<O[]>;

export type FromFn<O> = (barnes: Barnes<void>) => O[] | Promise<O[]>;

export type ComparatorFn<I> = (
  a: I,
  b: I,
  files: I[],
  barnes: Barnes<I>
) => number | Promise<number>;

export type ReducerFn<I, O> = (
  reducer: O,
  file: I,
  files: I[],
  barnes: Barnes<I>
) => Promise<O> | O;

export type SomeKindaFunction<I, O> =
  | ComparatorFn<I>
  | MapFn<I, O>
  | FromFn<O>
  | BatchFn<I, O>
  | FilterFn<I>
  | ReducerFn<I, O>
  | ForEachFn<I>
  | BarnesFn<I, O>;

export type BarnesPlugin<F extends SomeKindaFunction<any, any>> = F & {
  BARNES: Plugin;
};

export function plugin<O>(
  fn: FromFn<O>,
  type: Plugin.FROM
): BarnesPlugin<FromFn<O>>;

export function plugin<I, O>(
  fn: MapFn<I, O>,
  type: Plugin.MAP
): BarnesPlugin<MapFn<I, O>>;

export function plugin<I, O>(
  fn: FilterFn<I>,
  type: Plugin.FILTER
): BarnesPlugin<FilterFn<I>>;

export function plugin<I, O>(
  fn: BatchFn<I, O>,
  type: Plugin.ALL
): BarnesPlugin<BatchFn<I, O>>;

export function plugin<I, O>(
  fn: SomeKindaFunction<I, O>,
  type: never
): BarnesPlugin<SomeKindaFunction<I, O>> {
  return Object.assign(fn, { BARNES: type });
}

function sort<T>(
  barnes: Barnes<T>,
  files: T[],
  callback: ComparatorFn<T>
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    ams(
      files,
      async (a, b, done) => {
        const res = await callback(a, b, files, barnes);
        const num = res > 0 ? 1 : res < 0 ? -1 : 0;
        done(null, num);
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}

export default class Barnes<T> implements PromiseLike<any>, Promise<any> {
  public base: string;
  public metadata: any = {};
  public parent: Barnes<any> = null;

  private stack = [];

  public constructor(base: string = process.cwd()) {
    this.base = base;
  }

  public [Plugin.TAKE_WHILE]<I extends T>(predicate: FilterFn<I>): Barnes<I> {
    this.stack.push({
      callback: async (files: I[]) => {
        const out = [];
        for (const file of files) {
          if (await predicate(file, files, this)) {
            out.push(file);
          }
        }
        return out;
      },
      name: predicate.name,
      type: Plugin.TAKE_WHILE
    });
    return this;
  }

  public [Plugin.TAKE_UNTIL]<I extends T>(predicate: FilterFn<I>): Barnes<I> {
    this.stack.push({
      callback: async files => {
        const out = [];
        for (const file of files) {
          if (!(await predicate(file, files, this))) {
            out.push(file);
          }
        }
        return out;
      },
      name: predicate.name,
      type: Plugin.TAKE_UNTIL
    });
    return this;
  }

  public [Plugin.TAKE]<I extends T>(n: number): Barnes<I> {
    this.stack.push({
      callback: files => files.slice(0, n),
      type: Plugin.TAKE
    });
    return this;
  }

  public [Plugin.TAKE_LAST]<I extends T>(n: number): Barnes<I> {
    this.stack.push({
      callback: files => files.slice(-n),
      type: Plugin.TAKE_LAST
    });
    return this;
  }

  public [Plugin.REDUCE]<I extends T, O>(
    reducer: (reduction: O, file: I, files: I[], barnes) => Promise<O> | O,
    initial?: O
  ): Barnes<O> {
    this.stack.push({
      callback: async files => {
        let out = await initial;
        for (const file of files) {
          out = await reducer(out, file, files, this);
        }
        return out;
      },
      name: reducer.name,
      type: Plugin.REDUCE
    });
    return this as Barnes<O>;
  }

  public [Plugin.REDUCE_RIGHT]<I extends T, O>(
    reducer: (
      reduction: O,
      file: I,
      files: I[],
      barnes: Barnes<I>
    ) => Promise<O> | O,
    initial?: O | Promise<O>
  ): Barnes<O> {
    this.stack.push({
      callback: async files => {
        const rev = files.reverse();
        let out = await initial;
        for (const file of rev) {
          out = await reducer(out, file, rev, this);
        }
        return out;
      },
      name: reducer.name,
      type: Plugin.REDUCE_RIGHT
    });
    return this as Barnes<O>;
  }

  public [Plugin.COUNT]<I extends T>(): Barnes<number> {
    this.stack.push({
      callback: files => files.length,
      type: Plugin.COUNT
    });
    return this as Barnes<number>;
  }

  public [Plugin.FILTER]<I extends T>(predicate: FilterFn<I>): Barnes<I> {
    this.stack.push({
      callback: async files => {
        const out = [];
        for (const file of files) {
          if (await predicate(file, files, this)) {
            out.push(file);
          }
        }
        return out;
      },
      name: predicate.name,
      type: Plugin.FILTER
    });
    return this;
  }

  public [Plugin.FIND]<I extends T>(predicate: FilterFn<I>): Barnes<I> {
    this.stack.push({
      callback: async (files: any[]) => {
        for (const file of files) {
          if (await predicate(file, files, this)) {
            return file;
          }
        }
        return undefined;
      },
      name: predicate.name,
      type: Plugin.FIND
    });
    return this;
  }

  public [Plugin.FIND_LAST]<I extends T>(predicate: FilterFn<I>): Barnes<I> {
    this.stack.push({
      callback: async (files: I[]) => {
        let last;
        let next = files.shift();
        while (next) {
          if (!(await predicate(next, files, this))) {
            return last;
          } else {
            last = next;
            next = files.shift();
          }
        }
        return last;
      },
      name: predicate.name,
      type: Plugin.FIND_LAST
    });
    return this;
  }

  public [Plugin.MAX]<I extends T>(comparator: ComparatorFn<I>): Barnes<I> {
    this.stack.push({
      callback: async files => {
        const sorted = await sort(this, files, comparator);
        return sorted.pop();
      },
      name: comparator.name
    });
    return this;
  }

  public [Plugin.MIN]<I extends T>(comparator: ComparatorFn<I>): Barnes<I> {
    this.stack.push({
      callback: async files => {
        const sorted = await sort(this, files, comparator);
        return sorted.shift();
      },
      name: comparator.name,
      type: Plugin.MIN
    });
    return this;
  }

  public [Plugin.SORT]<I extends T>(comparator: ComparatorFn<I>): Barnes<I> {
    this.stack.push({
      callback: files => sort(this, files, comparator),
      name: comparator.name,
      type: Plugin.SORT
    });
    return this;
  }

  public [Plugin.TAP]<I extends T>(callback: BarnesFn<I, any>): Barnes<I> {
    this.stack.push({
      callback: async files => {
        for (const file of files) {
          await callback(file, files, this);
        }
        return files;
      },
      name: callback.name,
      type: Plugin.TAP
    });
    return this;
  }

  public [Plugin.ALL]<I extends T, O>(callback: BatchFn<I, O>): Barnes<O> {
    this.stack.push({
      callback: async files => {
        return callback(files, this);
      },
      name: callback.name,
      type: Plugin.ALL
    });
    return this as Barnes<O>;
  }

  public [Plugin.MAP]<I extends T, O>(callback: BarnesFn<I, O>): Barnes<O> {
    this.stack.push({
      callback: async files => {
        const promises = [];
        for (const file of files) {
          promises.push(callback(file, files, this));
        }
        return Promise.all(promises);
      },
      name: callback.name,
      type: Plugin.MAP
    });
    return this as Barnes<O>;
  }

  public [Plugin.FOR_EACH]<I extends T>(callback: ForEachFn<I>): Barnes<I> {
    this.stack.push({
      callback: async files => {
        const promises = [];
        for (const file of files) {
          promises.push(callback(file, files, this));
        }
        await Promise.all(promises);
        return;
      },
      name: callback.name,
      type: Plugin.FOR_EACH
    });
    return this;
  }

  public [Plugin.MAP_SERIES]<I extends T, O>(
    callback: BarnesFn<I, O>
  ): Barnes<O> {
    this.stack.push({
      callback: async files => {
        const out = [];
        for (const file of files) {
          out.push(await callback(file, files, this));
        }
        return out;
      },
      name: callback.name
    });
    return this as Barnes<O>;
  }

  public [Plugin.FOR_EACH_SERIES]<I extends T>(
    callback: ForEachFn<I>
  ): Barnes<I> {
    this.stack.push({
      callback: async files => {
        for (const file of files) {
          await callback(file, files, this);
        }
        return;
      },
      name: callback.name,
      type: Plugin.FOR_EACH_SERIES
    });
    return this;
  }

  public [Plugin.FROM]<O>(callback: FromFn<O>): Barnes<O> {
    this.stack.push({
      callback: async () => callback(this as Barnes<void>),
      name: callback.name,
      type: Plugin.FROM
    });
    return this as Barnes<O>;
  }

  public use<I extends T>(plugin: BarnesPlugin<FilterFn<I>>): Barnes<I>;
  public use<I extends T>(useable: BarnesPlugin<ForEachFn<I>>): Barnes<void>;
  public use<I extends T, O>(useable: BarnesPlugin<BatchFn<I, O>>): Barnes<O>;
  public use<I extends T, O>(useable: BarnesPlugin<MapFn<I, O>>): Barnes<O>;
  public use<I extends T, O>(useable: BatchFn<I, O> | Barnes<O>);
  public use<O>(useable: BarnesPlugin<FromFn<O>>): Barnes<O>;

  public use<I extends T, O>(useable: Useable<I, O>): Barnes<O> {
    if (useable instanceof Barnes) {
      useable.parent = this;
      this.stack.push({
        callback: async files => {
          const res = await useable;
          return [...files, ...res];
        },
        type: Plugin.ALL
      });
    } else {
      const cb = (useable as any).BARNES || Plugin.ALL;
      this[cb].call(this, useable);
    }
    return this as Barnes<O>;
  }

  public async execute() {
    let res = [];
    for (const { callback } of this.stack) {
      try {
        res = await callback(res);
      } catch (e) {
        console.error(e);
      }
    }
    return res;
  }

  public then(callback: (res: any) => PromiseLike<any>) {
    return this.execute().then(callback);
  }

  public catch(callback: (res: any) => PromiseLike<any>) {
    return this.execute().catch(callback);
  }

  public finally(callback: () => void) {
    return this.execute().finally(callback);
  }

  get [Symbol.toStringTag](): 'Promise' {
    return 'Promise';
  }
}
