import Barnes, { plugin, Plugin } from 'barnes';
import parse from 'parse-glob';

import { dotfiles, frontmatter, IFile, read as _read, source } from './utils';

export default function(path?: string) {
  return plugin<any, IFile>(async function read(prev, barnes) {
    const curr = await new Barnes(barnes.base)
      .use<any>(path ? source(path) : plugin(async () => prev, Plugin.FROM))
      .use(dotfiles())
      .use(_read())
      .use(frontmatter());

    return path
      ? [
          ...prev,
          ...curr.map(f => {
            const parsed = parse(path);
            return {
              ...f,
              filename: f.filename.replace(parsed.base, '')
            };
          })
        ]
      : curr;
  }, Plugin.ALL);
}
