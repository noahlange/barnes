import Barnes, { logger, plugin, Plugin } from 'barnes';
import { Gaze } from 'gaze';
import throttle from 'lodash.throttle';
import dedupe from 'lodash.uniq';
import parse from 'parse-glob';
import { join, sep } from 'path';

import { dotfiles, frontmatter, IFile, read, source } from './utils';

const log = logger('fs/watch');

// recursive parent fetcher
const p = (barnes: Barnes<any>) => (barnes.parent ? p(barnes.parent) : barnes);

export default function(glob: string) {
  let gaze;
  let active = [];
  let toProcess = [];

  function watcher(barnes: Barnes<string[]>) {
    const throttled = throttle(async () => {
      active = dedupe(toProcess);
      log(`${active.length} files updated, rebuilding.`, 'info');
      await p(barnes).execute();
    }, 2500);

    return plugin(async filenames => {
      if (!gaze) {
        gaze = new Gaze(join(barnes.base, glob));
        await new Promise(resolve =>
          gaze.on('ready', () => {
            log(`Barnes is watching files from ${glob}.`);
            resolve();
          })
        );
        gaze.on('error', e => {
          log(e.message, 'danger');
        });
        gaze.on('all', (_, filepath) => {
          toProcess.push(filepath);
          throttled();
        });
        return filenames;
      }
      return [...filenames, ...active];
    }, Plugin.ALL);
  }

  return plugin<any, IFile>(async function watch(files, barnes) {
    const out = await new Barnes(barnes.base)
      .use(source(glob, !!gaze))
      .use(watcher(barnes))
      .use(dotfiles())
      .use(read())
      .use(frontmatter());

    active = [];
    toProcess = [];

    return [
      ...files,
      ...out.map(f => {
        const parsed = parse(glob);
        const replace = parsed.base === '.' ? '' : parsed.base;
        return {
          ...f,
          filename: f.filename
            .replace(replace, '')
            .replace(new RegExp(`^${sep}`), '')
        };
      })
    ];
  }, Plugin.ALL);
}
