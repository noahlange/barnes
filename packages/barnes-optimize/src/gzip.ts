import { plugin, Plugin } from 'barnes';
import match from 'multimatch';
import * as zlib from 'zlib';

interface IFile {
  filename: string;
  contents: Buffer;
}

export default () => {
  return plugin(async function gzip(files: IFile[]) {
    const compress = match(
      files.map(f => f.filename),
      '**/*.+(html|css|js|json|xml|svg|txt)'
    );

    const done = await Promise.all(
      files.filter(f => compress.includes(f.filename)).map(
        file =>
          new Promise((resolve, reject) => {
            const zip = zlib.createGzip();
            const zipped: any[] = [];
            zip.on('data', (c: any) => zipped.push(c));
            zip.on('error', reject);
            zip.on('end', () => {
              resolve({
                ...file,
                contents: Buffer.from(zipped),
                filename: file.filename + '.gz'
              });
            });
            zip.write(file.contents);
            zip.end();
          })
      )
    );

    return [...files, ...done];
  }, Plugin.ALL);
};
