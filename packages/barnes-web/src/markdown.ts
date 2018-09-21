import { plugin, Plugin } from 'barnes';
import MarkdownIt from 'markdown-it';
import highlight from 'markdown-it-prism';

import { IFile } from './layouts';

interface IBarnesMarkdownOpts {
  markdown?: MarkdownIt.Options;
};

export default function markdown(
  options: IBarnesMarkdownOpts = {}
) {

  const md = new MarkdownIt({
    html: true,
    typographer: true,
    ...options.markdown
  }).use(highlight);

  return plugin(async (file: IFile) => {
    if (/.md$/.test(file.filename)) {
      const contents = file.contents.toString();
      file.contents = Buffer.from(md.render(contents));
      file.filename = file.filename.replace('.md', '.html');
    }
    return file;
  }, Plugin.MAP);
}
