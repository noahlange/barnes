import Barnes, { logger, plugin, Plugin } from 'barnes';
import { Gaze } from 'gaze';
import throttle from 'lodash.throttle';
import dedupe from 'lodash.uniq';
import parse from 'parse-glob';
import { join } from 'path';

import { dotfiles, frontmatter, IFile, read, source } from './utils';

const log = logger('fs/watch');

export default function(path: string) {
  let gaze;
  let active = [];
  let toProcess = [];

  function _watch(barnes: Barnes<string[]>, glob: string) {
    const throttled = throttle(async () => {
      active = dedupe(toProcess);
      log(`${active.length} files updated, rebuilding.`, 'info');
      await barnes.execute();
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
    barnes.metadata.watch = true;

    const out = await new Barnes(barnes.base)
      .use(source(path, !!gaze))
      .use(_watch(barnes, path))
      .use(dotfiles())
      .use(read())
      .use(frontmatter());

    active = [];
    toProcess = [];

    return [
      ...files,
      ...out.map(f => {
        const parsed = parse(path);
        const replace = parsed.base === '.' ? '' : parsed.base;
        return {
          ...f,
          filename: f.filename
            .replace(replace, '')
            .replace(/^\//, '')
        };
      })
    ];
  }, Plugin.ALL);
}
