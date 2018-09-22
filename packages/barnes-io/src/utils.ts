
import { plugin, Plugin } from 'barnes';
import { readFile, stat, Stats, writeFile } from 'fs';
import { ensureFile } from 'fs-extra';
import globby from 'globby';
import gm from 'gray-matter';
import isUTF8 from 'is-utf8';
import { basename, join, sep } from 'path';
import { promisify } from 'util';

export interface IFile {
  contents: Buffer;
  stats: Stats;
  filename: string;
  [key: string]: any;
}

export function source(path: string, isWatching: boolean = false) {
  return plugin(async barnes => {
    const empty: string[] = [];
    return isWatching
      ? empty
      : globby(join(barnes.base, path));
  }, Plugin.FROM);
}

export function read() {
  const readFileP = promisify(readFile);
  const statP = promisify(stat);
  return plugin<string, IFile>(async (file, files, barnes) => {
    return {
      contents: await readFileP(file),
      filename: file.replace(barnes.base + sep, ''),
      stats: await statP(file),
    };
  }, Plugin.MAP);
}

export function dotfiles() {
  return plugin(async (file: string) => {
    return !basename(file).startsWith('.');
  }, Plugin.FILTER);
}

export function frontmatter() {
  return plugin<IFile, IFile>(async files => {
    const res = [];
    for (const file of files) {
      if (isUTF8(file.contents)) {
        const { data, content } = gm(file.contents.toString());
        Object.assign(file, data, {
          contents: Buffer.from(content)
        });
      }
      res.push(file);
    }
    return res;
  }, Plugin.ALL);
}

export function write(name: string, contents: Buffer | string, encoding?: string) {
  return new Promise((resolve, reject) => {
    ensureFile(name, err1 => {
      if (err1) {
        reject(err1);
      } else if (encoding) {
        writeFile(name, contents, encoding, err2 => {
          err2 ? reject(err2) : resolve(null);
        });
      } else {
        writeFile(name, contents, err2 => {
          err2 ? reject(err2) : resolve(null);
        });
      }
    });
  });
}
