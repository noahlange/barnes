import test from 'ava';
import Barnes from 'barnes';

import read from '../read';

test('read', async t => {
  const res = await new Barnes(__dirname)
    .use(read('*'))
    .find(file => file.filename === 'read.ts');

  t.truthy(res);
});
