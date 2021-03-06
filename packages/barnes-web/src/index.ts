import { Stats } from 'fs';

import collections from './collections';
import layouts from './layouts';
import markdown from './markdown';
import paths from './paths';

export interface IFile {
  filename: string;
  contents: Buffer;
  stats: Stats;
  layout?: string;
  collection?: string;
  absolute?: string;
}

export { collections, layouts, markdown, paths };
