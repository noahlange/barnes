import { plugin, Plugin } from 'barnes';
import { buffer } from 'imagemin';
import isImage from 'is-image';

interface IFile {
  filename: string;
  contents: Buffer;
}

export default (opts: any = {}) => {
  const p = [
    require('imagemin-gifsicle'),
    require('imagemin-jpeg-recompress'),
    require('imagemin-pngquant'),
    require('imagemin-svgo'),
    ...(opts.plugins || [])
  ];
  return plugin(async function imagemin(file: IFile) {
    if (isImage(file.filename)) {
      file.contents = await buffer(file.contents, { plugins: p.map(i => i()) });
    }
    return file;
  }, Plugin.MAP);
};
