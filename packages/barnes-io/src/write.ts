import { logger, plugin, Plugin } from 'barnes';
import { ensureFile, writeFile } from 'fs-extra';
import { join } from 'path';

import { IFile } from './utils';

const log = logger('fs/write');

export default path => {
  const w = async (name, contents, options?) => {
    await ensureFile(name);
    await writeFile(name, contents, options);
  };
  return plugin<IFile, IFile>(async function write(file, files, barnes) {
    const filename = join(barnes.base, path, file.filename);
    await w(filename, file.contents, { encoding: 'utf8' });
    if (file === files[files.length - 1]) {
      log(`Wrote ${ files.length } files to disk.`, 'success');
    }
    return { ...file, filename };
  }, Plugin.MAP);
};