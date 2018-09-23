import ams from 'async-merge-sort';
import Barnes, { plugin, Plugin } from 'barnes';
import match from 'multimatch';

import { IFile } from './index';

interface ICollectionConfig extends IUserCollectionConfig {
  name: string;
}

interface IUserCollectionConfig {
  pattern: string;
  sort?: (a: IFile, b: IFile) => Promise<number> | number;
}

interface ICollectionPluginConfig {
  [key: string]: string | IUserCollectionConfig;
}

const defaultConfig: ICollectionConfig = {
  name: null,
  pattern: null,
  sort: (b: IFile, a: IFile) => {
    const astats = a.stats;
    const bstats = b.stats;
    if (astats && bstats) {
      return (
        b.stats.ctime.getUTCMilliseconds() - a.stats.ctime.getUTCMilliseconds()
      );
    } else {
      return b.filename.localeCompare(a.filename);
    }
  }
};

const map = ([name, cfg]): ICollectionConfig => {
  if (typeof cfg === 'string') {
    return { ...defaultConfig, name, pattern: cfg };
  }
  return { ...defaultConfig, name, ...cfg };
};

function sort<T>(entries: T[], callback) {
  return new Promise((resolve, reject) => {
    ams(
      entries,
      async (a, b, done) => {
        const res = await callback(a, b);
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

export default function(options: ICollectionPluginConfig = {}) {
  const configs: Record<string, ICollectionConfig> = Object.entries(options)
    .map(map)
    .reduce((a, b) => ({ ...a, [b.name]: b }), {});

  const store: Record<string, Record<string, IFile>> = Object.keys(
    options
  ).reduce((a, b) => ({ ...a, [b]: {} }), {});

  return plugin(async function collections(
    files: IFile[],
    barnes: Barnes<IFile>
  ) {
    for (const file of files) {
      if (file.collection) {
        if (!(file.collection in store)) {
          store[file.collection] = {};
        }
        const c = store[file.collection];
        store[file.collection] = { ...c, [file.filename]: file };
      } else {
        for (const [name, cfg] of Object.entries(configs)) {
          if (match(file.filename, cfg.pattern).length) {
            const c = store[name];
            store[name] = { ...c, [file.filename]: file };
          }
        }
      }
    }

    barnes.metadata.collections = await Object.entries(store).reduce(
      async (a, [name, entries]) => {
        const res = await a;
        const sorter = (configs[name] || defaultConfig).sort;
        const sorted = sorter
          ? await sort(Object.values(entries), sorter)
          : Object.values(entries);
        return { ...res, [name]: sorted };
      },
      Promise.resolve({})
    );

    return files;
  },
  Plugin.ALL);
}
