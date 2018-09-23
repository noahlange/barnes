import { logger, plugin, Plugin } from 'barnes';
import reload from 'tiny-lr';

const log = logger('dev/livereload');

export interface IFile {
  filename: string;
}

export default function livereload(port: number = 35729) {
  let notified = false;
  const server = reload();
  server.listen(port);
  return plugin((files: IFile[]) => {
    if (!notified) {
      log(`LiveReload server listening on port ${port}`);
      notified = true;
    }
    if (files.length > 0) {
      server.changed({ body: { files: files.map(f => f.filename) } });
      log(`Changes detected to ${files.length} file(s), reloading.`, 'success');
    }
    return files;
  }, Plugin.ALL);
}
