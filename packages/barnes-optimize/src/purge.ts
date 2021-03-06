import { logger, plugin, Plugin } from 'barnes';
import PurgeCSS from 'purgecss';

import { IFile } from './utils';

interface IBarnesPurgePluginOpts {
  patterns?: {
    css?: RegExp;
    html?: RegExp;
  };
}

interface IBarnesPurgeOpts {
  patterns: {
    css: RegExp;
    html: RegExp;
  };
}

const log = logger('optimize/purge');

export default function purge(options: IBarnesPurgePluginOpts = {}) {
  const opts: IBarnesPurgeOpts = {
    ...options,
    patterns: {
      css: /.css/,
      html: /.html/,
      ...options.patterns
    }
  };

  const htmlCache: Record<string, IFile> = {};
  const cssCache: Record<string, IFile> = {};

  return plugin(async (files: IFile[]) => {
    let total = 0;

    const isContent = (f: IFile) => opts.patterns.html.test(f.filename);
    const areStyles = (f: IFile) => opts.patterns.css.test(f.filename);

    const content = files.filter(isContent);
    const styles = files.filter(areStyles);

    content.forEach(file => {
      htmlCache[file.filename] = file;
    });

    styles.forEach(file => {
      cssCache[file.filename] = file;
    });

    try {
      const purged = new PurgeCSS({
        content: Object.values(htmlCache).map(f => ({
          extension: 'html',
          raw: f.contents.toString()
        })),
        css: Object.values(cssCache).map(f => ({
          extension: 'css',
          file: f.filename,
          raw: f.contents.toString()
        }))
      }).purge();
      const allStyles = Object.entries(cssCache);
      for (let i = 0; i < purged.length; i++) {
        const [filename, file] = allStyles[i];
        const css = purged[i].css;
        // if the modified file isn't in the changed file list, add it.
        const found = files.findIndex(f => f.filename === filename);
        if (found > -1) {
          files[found] = {
            ...files[found],
            contents: Buffer.from(css)
          };
          total++;
        } else if (file.contents.toString() !== css) {
          files.push({ ...file, contents: Buffer.from(css) });
          total++;
        }
      }
    } catch (e) {
      log(e.message, 'danger');
    }

    if (total) {
      log(`Purged ${total} CSS files.`, 'success');
    }

    return files;
  }, Plugin.ALL);
}
