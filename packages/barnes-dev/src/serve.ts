import { logger, plugin, Plugin } from 'barnes';
import ecstatic from 'ecstatic';
import { createServer } from 'http';
import { resolve } from 'path';

const log = logger('dev/serve');

export default function serve(path: string, port: number = 8080) {
  let server = null;
  return plugin(async (files, barnes) => {
    if (!server) {
      const e = ecstatic({ root: resolve(barnes.base, path) });
      server = createServer(e).listen(port);
      log(`Barnes is serving content from ${path} on port ${port}.`);
    }
    return files;
  }, Plugin.ALL);
}
