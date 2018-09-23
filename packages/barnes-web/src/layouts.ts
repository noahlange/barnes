import Barnes, { plugin, Plugin } from 'barnes';
import jsTransformer from 'jstransformer';
import toTransformer from 'jstransformer-jstransformer';
import match from 'multimatch';
import { join } from 'path';
import { IFile } from './index';

interface IBarnesLayoutsOpts {
  default: string;
  directory?: string;
  options: object;
  pattern?: string;
}

const p = b => (b.parent ? p(b.parent) : b);

export default (opts: IBarnesLayoutsOpts) => {
  const options = { pattern: '**/*.html', directory: '', ...opts };
  return plugin(async (files: IFile[], barnes: Barnes<IFile>) => {
    const out = [];
    for (const file of files) {
      const render = match([file.filename], [options.pattern]);
      if (render.length) {
        const template = file.layout || options.default;
        const path = join(barnes.base, options.directory, template);
        try {
          const t = jsTransformer(toTransformer);
          const contents = await t.renderFile(path, options.options, {
            ...barnes.metadata,
            ...file,
            files
          });
          file.contents = Buffer.from(contents.body);
        } catch (e) {
          // no-op
        }
      }
    }
    return out;
  }, Plugin.ALL);
};
