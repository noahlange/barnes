import test from 'ava';
import Barnes from 'barnes';

import paths from '../paths';

test('clean urls', async t => {
  const files = [{ filename: '12345.html' }];
  const res = await new Barnes(__dirname)
    .from(() => files)
    .use(paths())
    .map(file => file.filename === '12345/index.html');
  t.truthy(res);
});
