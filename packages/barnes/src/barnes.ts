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

export type BarnesMapFn<I, O> = BarnesFn<I, O>;
export type BarnesForEachFn<I> = BarnesFn<I, void>;
export type BarnesFilterFn<I> = BarnesFn<I, boolean>;

export type BarnesAllFn<I, O> = (
  files: I[],
  barnes: Barnes<I>
) => O[] | Promise<O[]>;

export type BarnesFromFn<O> = (barnes: Barnes<void>) => O[] | Promise<O[]>;

export type BarnesComparatorFn<I> = (a: I, b: I, files: I[], barnes: Barnes<I>) => number | Promise<number>;

export type BarnesReducerFn<I, O> = (
  reducer: O,
  file: I,
  files: I[],
  barnes: Barnes<I>
) => Promise<O> | O;

export type SomeKindaBarnesFunction<I, O> =
  | BarnesComparatorFn<I>
  | BarnesMapFn<I, O>
  | BarnesFromFn<O>
  | BarnesAllFn<I, O>
  | BarnesFilterFn<I>
  | BarnesReducerFn<I, O>
  | BarnesForEachFn<I>
  | BarnesFn<I, O>

export type BarnesPlugin<F extends SomeKindaBarnesFunction<any, any>> = F & {
  BARNES: Plugin;
};

export function plugin<O>(
  fn: BarnesFromFn<O>,
  type: Plugin.FROM
): BarnesPlugin<BarnesFromFn<O>>;

export function plugin<I, O>(
  fn: BarnesMapFn<I, O>,
  type: Plugin.MAP
): BarnesPlugin<BarnesMapFn<I, O>>;

export function plugin<I, O>(
  fn: BarnesFilterFn<I>,
  type: Plugin.FILTER
): BarnesPlugin<BarnesFilterFn<I>>;

export function plugin<I, O>(
  fn: BarnesAllFn<I, O>,
  type: Plugin.ALL
): BarnesPlugin<BarnesAllFn<I, O>>;

export function plugin<I, O>(
  fn: SomeKindaBarnesFunction<I, O>,
  type: never
): BarnesPlugin<SomeKindaBarnesFunction<I, O>> {
  return Object.assign(fn, { BARNES: type });
}

function sort<T>(barnes: Barnes<T>, files: T[], callback: BarnesComparatorFn<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    ams(files, async (a, b, done) => {
      const res = await callback(a, b, files, barnes);
      done(res);
    }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    })
  })
}

export default class Barnes<T> implements PromiseLike<any>, Promise<any> {
  public base: string;
  public metadata: any = {};

  private stack = [];

  public constructor(base: string = __dirname) {
    this.base = base;
  }

  public [Plugin.TAKE_WHILE]<I extends T>(
    predicate: BarnesFilterFn<I>
  ): Barnes<I> {
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

  public [Plugin.TAKE_UNTIL]<I extends T>(
    predicate: BarnesFilterFn<I>
  ): Barnes<I> {
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

  public [Plugin.FILTER]<I extends T>(predicate: BarnesFilterFn<I>): Barnes<I> {
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

  public [Plugin.FIND]<I extends T>(predicate: BarnesFilterFn<I>): Barnes<I> {
    this.stack.push({
      callback: async (files: any[]) => {
        for (const file of files) {
          if (await predicate(file, files, this)) {
            return
          }
        }
        return undefined;
      },
      name: predicate.name,
      type: Plugin.FIND
    });
    return this;
  }

  public [Plugin.FIND_LAST]<I extends T>(
    predicate: BarnesFilterFn<I>
  ): Barnes<I> {
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
        return undefined;
      },
      name: predicate.name,
      type: Plugin.FIND_LAST
    });
    return this;
  }

  public [Plugin.MAX]<I extends T>(
    comparator: BarnesComparatorFn<I>
  ): Barnes<I> {
    this.stack.push({
      callback: async files => {
        const sorted = await sort(this, files, comparator);
        return sorted.pop();
      },
      name: comparator.name
    });
    return this;
  }

  public [Plugin.MIN]<I extends T>(
    comparator: BarnesComparatorFn<I>
  ): Barnes<I> {
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

  public [Plugin.SORT]<I extends T>(
    comparator: BarnesComparatorFn<I>
  ): Barnes<I> {
    this.stack.push({
      callback: files => sort(this, files, comparator),
      name: comparator.name,
      type: Plugin.SORT
    });
    return this;
  }

  public [Plugin.TAP]<I extends T>(callback: BarnesFn<I, I>): Barnes<I> {
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

  public [Plugin.ALL]<I extends T, O>(callback: BarnesAllFn<I, O>): Barnes<O> {
    this.stack.push({
      callback: async files => {
        return callback(files, this);
      },
      name: callback.name,
      type: Plugin.ALL
    });
    return this as Barnes<O>;
  }

  public [Plugin.MAP]<I extends T, O>(callback: BarnesFn<I, O>): Barnes<T> {
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
    return this;
  }

  public [Plugin.FOR_EACH]<I extends T>(
    callback: BarnesForEachFn<I>
  ): Barnes<I> {
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
    callback: BarnesForEachFn<I>
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

  public [Plugin.FROM]<O>(callback: BarnesFromFn<O>): Barnes<O> {
    this.stack.push({
      callback: async () => callback(this as Barnes<void>),
      name: callback.name,
      type: Plugin.FROM
    });
    return this as Barnes<O>;
  }

  public use<I extends T>(plugin: BarnesPlugin<BarnesFilterFn<I>>): Barnes<I>;
  public use<I extends T>(
    plugin: BarnesPlugin<BarnesForEachFn<I>>
  ): Barnes<void>;
  public use<I extends T, O>(
    plugin: BarnesPlugin<BarnesAllFn<I, O>> | BarnesPlugin<BarnesMapFn<I, O>>
  ): Barnes<O>;
  public use<O>(plugin: BarnesPlugin<BarnesFromFn<O>>): Barnes<O>;
  public use<I extends T, O>(
    plugin: BarnesPlugin<SomeKindaBarnesFunction<I, O>>
  ): Barnes<O> {
    const plugins = Array.isArray(plugin) ? plugin : [plugin];
    for (const p of plugins) {
      this[p.BARNES || Plugin.ALL].call(this, p);
    }
    return this as Barnes<O>;
  }

  public async execute() {
    let res = [];
    for (const { callback, name, type } of this.stack) {
      try {
        res = await callback(res);
        if (Array.isArray(res)) {
          res = res.filter(f => f !== null);
        }
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
