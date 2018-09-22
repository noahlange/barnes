import { plugin, Plugin } from 'barnes';
import { basename, join, parse, ParsedPath } from 'path';

import { IFile } from './index';

export interface IPathedFile extends IFile {
  path: ParsedPath;
  dhref: string;
  href: string;
}

export default function(opts = { clean: true }) {
  return plugin(async function paths(file: IFile): Promise<IPathedFile> {
    if (/html$/.test(file.filename) && opts.clean) {
      const base = basename(file.filename);
      file.filename =
        base === 'index.html'
          ? file.filename
          : file.filename.replace(/.html$/, '/index.html');
    }
    const path = parse(file.filename);
    const dhref = path.dir;
    const href = join(dhref, basename(file.filename));
    return { ...file, path, dhref, href };
  },
  Plugin.MAP);
}
