import { plugin, Plugin } from 'barnes';
import MarkdownIt from 'markdown-it';
import { IFile } from './index';

interface IBarnesMarkdownOpts {
  markdown?: MarkdownIt.Options;
  plugins?: {
    [key: string]: any;
  };
}

export default function markdown(options: IBarnesMarkdownOpts = {}) {
  const opts = {
    markdown: {},
    plugins: {},
    ...options
  };
  let md = new MarkdownIt({
    html: true,
    typographer: true,
    ...opts.markdown
  });

  for (const name of Object.keys(opts.plugins)) {
    md = md.use(require(name), opts.plugins[name]);
  }

  return plugin(async (file: IFile) => {
    if (/.md$/.test(file.filename)) {
      const contents = file.contents.toString();
      file.contents = Buffer.from(md.render(contents));
      file.filename = file.filename.replace('.md', '.html');
    }
    return file;
  }, Plugin.MAP);
}
