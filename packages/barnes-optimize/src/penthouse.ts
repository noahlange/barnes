import { logger, plugin, Plugin } from 'barnes';
import { load } from 'cheerio';
import { tmpdir } from 'os';
import PQueue from 'p-queue';
import { join } from 'path';
import penthouse from 'penthouse';

import { IFile, write } from './utils';

const log = logger('optimize/penthouse');

interface IPenthousePluginOptions {
  cache?: boolean;
  cacheBy?: string;
  concurrency?: number,
  patterns?: {
    css: RegExp;
    html: RegExp
  }
}

interface IPenthouseOptions {
  cache: boolean;
  cacheBy: string;
  concurrency: number,
  patterns: {
    css: RegExp;
    html: RegExp
  }
}

export default function(options: IPenthousePluginOptions) {

  const o: IPenthouseOptions = {
    cache: true,
    cacheBy: 'layout',
    concurrency: 5,
    patterns: { css: /.css$/, html: /.html$/ },
    ...options
  };

  const cssCache: Record<string, string> = {};

  return plugin(async (files: IFile[]) => {
  
    const cache: Record<string, string> = {};

    let inlined = 0;

    for (const file of files) {
      cssCache[file.filename] = file.contents.toString();
    }

    /**
     * First we need to concatenate all our css into a single file.
     * We don't know which pages will be using which css, so it's best
     * to be conservative and just stich 'em all together.
     */
    const cssString = Object.values(cssCache)
      .reduce((css, file) => css + file, '');

    /**
     * And now, for each html file (or with cache enabled, each layout type),
     * we'll process our templates through penthouse and inline our css.
     */
    const promises = files
      .map(file => async () => {
        let inline = null;
        const tpl = file[o.cacheBy];

        if (!o.patterns.html.test(file.filename)) {
          return file;
        }

        if (cache[tpl]) {
          inline = file;
        }

        const path = join(tmpdir(), file.filename);
        await write(path, file.contents, 'utf8');

        try {
          if (!inline) {
            inline = await penthouse({ url: `file:///${path}`, cssString });
            cache[tpl] = inline;
          }

          const $ = load(file.contents.toString());
          $('head').append(`<style type="text/css">${inline}</style>`);
          $('head link').each((i, e) => $('body').append($(e)));
          $('head link').remove();

          file.contents = Buffer.from($.html());
          inlined++;
        } catch (e) {
          log(e.message, 'danger');
        }
        return file;
      });

    files = await new PQueue({ concurrency: o.concurrency })
      .addAll(promises);

    if (inlined) {
      log(`Inlined ${ inlined } files.`, 'success');
    }

    return files;
  }, Plugin.ALL);
}
