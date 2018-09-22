import Barnes, { plugin, Plugin } from 'barnes';
import jsTransformer from 'jstransformer';
import toTransformer from 'jstransformer-jstransformer';
import match from 'multimatch';
import { join } from 'path';
import { IFile } from './index';

interface IBarnesLayoutsOpts {
  pattern?: string;
  default: string;
  directory?: string;
  options: object;
};


export default (opts: IBarnesLayoutsOpts) => {
  return plugin(async (file: IFile, files: IFile[], barnes: Barnes<IFile>) => {
    const render = match([ file.filename ], [opts.pattern || '**/*.html']);
    if (render.length) {
      const template = file.layout || opts.default;
      const path = join(barnes.base, opts.directory || '', template);
      try {
        const t = jsTransformer(toTransformer)
        const contents = await t.renderFile(path, opts.options, {
          ...barnes.metadata,
          ...file,
          files
        });
        file.contents = Buffer.from(contents.body);
      } catch (e) {
        // no-op
      }
    }
    return file;
  }, Plugin.MAP);
};
