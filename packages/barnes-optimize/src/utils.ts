import { ensureFile, writeFile } from 'fs-extra';

export async function write(path: string, contents: Buffer, encoding?: string) {
  await ensureFile(path);
  await writeFile(path, contents, { encoding });
}

export interface IFile {
  filename: string;
  contents: Buffer;
  layout?: string;
  base64?: string;
  [key: string]: any;
}
