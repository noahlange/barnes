import Barnes, { plugin, Plugin } from 'barnes';
import match from 'multimatch';

import { IFile } from './index';

interface ICollectionConfig extends IUserCollectionConfig {
  name: string;
}

interface IUserCollectionConfig {
  pattern: string;
  sortBy?: string;
  reverse?: boolean;
}

interface ICollectionPluginConfig {
  [key: string]: string | IUserCollectionConfig;
}

const map = ([name, cfg]): ICollectionConfig => {
  const obj: ICollectionConfig = {
    name,
    pattern: null,
    reverse: true,
    sortBy: 'date'
  };
  if (typeof cfg === 'string') {
    return { ...obj, pattern: cfg };
  }
  return { ...obj, ...cfg };
};

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
          if (match([file.filename], [cfg.pattern])) {
            const c = store[name];
            store[name] = { ...c, [file.filename]: file };
          }
        }
      }
    }

    barnes.metadata.collections = Object.entries(store).reduce(
      (a, [name, entries]) => ({ ...a, [name]: Object.values(entries) }),
      {}
    );

    return files;
  },
  Plugin.ALL);
}
