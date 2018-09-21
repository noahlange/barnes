import { logger, md5, plugin, Plugin } from 'barnes';
import { encode } from 'base-64';
import { CheerioStatic, load } from 'cheerio';
import isImage from 'is-image';
import { tmpdir } from 'os';
import Queue from 'p-queue';
import { join } from 'path';
import sharp from 'sharp';
import sqip from 'sqip';
import SVGO from 'svgo';

import { IFile, write } from './utils';

interface ILazyLoadOptions {
  cache: boolean;
  concurrency: number;
  test: (file: IFile) => boolean;
  method: 'sqip';
}

interface ISVGOOptions {
  plugins: Array<{ [key: string]: boolean }>;
}

function svgoOptions() {
  const options: ISVGOOptions = { plugins: [] };
  const plugins = [
    'cleanupAttrs',
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeTitle',
    'removeDesc',
    'removeUselessDefs',
    'removeEditorsNSData',
    'removeEmptyAttrs',
    'removeHiddenElems',
    'removeEmptyText',
    'removeEmptyContainers',
    'removeViewBox',
    'cleanupEnableBackground',
    'convertStyleToAttrs',
    'convertColors',
    'convertPathData',
    'convertTransform',
    'removeUnknownsAndDefaults',
    'removeNonInheritableGroupAttrs',
    'removeUselessStrokeAndFill',
    'removeUnusedNS',
    'cleanupIDs',
    'cleanupNumericValues',
    'moveElemsAttrsToGroup',
    'moveGroupAttrsToElems',
    'collapseGroups',
    'removeRasterImages',
    'mergePaths',
    'convertShapeToPath',
    'sortAttrs',
    'removeDimensions'
  ];
  for (const name of plugins) {
    options.plugins.push({ [name]: true });
  }
}

export default function lazyload(options: ILazyLoadOptions) {

  const log = logger('optimize/lquip');
  const md5cache: Record<string, string> = {};
  const b64cache: Record<string, string> = {};

  const svgo = new SVGO(svgoOptions());
  const opts: ILazyLoadOptions = {
    cache: true,
    concurrency: 5,
    method: 'sqip',
    test: file => isImage(file.filename),
    ...options
  };

  return plugin(async (files: IFile[]) => {
    const time = Date.now();
    let imagesChanged = 0;
    let filesChanged = 0;

    const fileHash: Record<string, IFile> 
      = files.reduce((a, b) => ({ ...a, [b.filename]: b }), {});
    const toProcess: string[] = [];
    const toRewrite: Record<string, CheerioStatic> = {};
  
    for (const file of files) {
      const filename = file.filename;
      if (/.html$/.test(filename)) {
        const $ = load(file.contents.toString());
        const images: string[] = [];
        $('img').each((i, e) => {
          const src = $(e).attr('src');
          images.push(
            src.startsWith('/')
              ? src.slice(1)
              : src
          );
        });
        if (images.length) {
          toProcess.push(...images);
          toRewrite[filename] = $;
        }
      }
    }

    const promises = toProcess
      .filter(filename => filename in md5cache)
      .map(filename => async (): Promise<void> => {
        if (filename in fileHash) {
          const file: IFile = fileHash[filename];
          if (opts.test(file)) {
            const hash = await md5(file.contents);
            if (file.filename in md5cache) {
              file.base64 = b64cache[file.filename];
              return;
            } else {
              const image = await sharp(file.contents);
              const meta = await image.metadata();
              const shrunk = await image.resize(64, Math.ceil(256 / (meta.width || 256) / (meta.height || 256)));
              const filepath = join(tmpdir(), file.filename);
              await write(filepath, await shrunk.toBuffer());
              const sqipped = await sqip({ filename: filepath });
              const svg = await svgo.optimize(sqipped.final_svg);
              const base64: string = encode(svg.data || sqipped.final_svg);
              file.base64 = base64;
              md5cache[filename] = hash;
              b64cache[filename] = base64;
              return;
            }
          }
        } else {
          log(`"${ filename }" not in changed files or file cache.`, 'warning');
          return;
        }
      });
    if (promises.length) {
      log(`LQIPing ${promises.length} images; this may take a while.`, 'warning');
    }
    await new Queue({
      concurrency: opts.concurrency
    }).addAll(promises);

    for (const filename of Object.keys(toRewrite)) {
      const $ = toRewrite[filename];
      let dirty = false;
      $('img').each((i, e) => {
        let src = $(e).attr('src');
        src = src.startsWith('/') ? src.slice(1) : src;
        const b64 = b64cache[src];
        if (b64) {
          imagesChanged++;
          $(e).attr('src', `data:image/svg+xml;base64,${b64}`);
          dirty = true;
        }
      });
      if (dirty) {
        const file = files.find(f => f.filename === filename);
        if (file) {
          filesChanged++;
          file.contents = Buffer.from($.html());
        }
      }
    }

    if (imagesChanged || filesChanged) {
      const elapsed = (Date.now() - time) / 1000;
      log(`Processed ${ imagesChanged } images across ${ filesChanged } files in ${elapsed}.`);
    }
    return files;
  }, Plugin.ALL)
}
