import test from 'ava';
import Barnes from 'barnes';

import { markdown } from '../index';

test('should rewrite extensions', async t => {
  const md = [
    { filename: 'foo.html' },
    { filename: 'foo.md', contents: Buffer.from('# OH HI MARK') }
  ];

  const files = await new Barnes()
    .from(() => md)
    .use(markdown())
    .map(file => file.filename)
    .filter(file => file.endsWith('.html'))
    .count();

  t.is(files, 2);
});
