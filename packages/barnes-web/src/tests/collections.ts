import test from 'ava';
import Barnes from 'barnes';
import collections from '../collections';

test('should build collections with pattern shorthand', async t => {

  const files = [
    { filename: 'files/foo/index.md' },
    { filename: 'files/bar.md' }
  ];

  const res = await new Barnes()
    .from(() => files)
    .use(collections({
      files: 'files/**/*.md'
    }))
    .all((_, barnes) => barnes.metadata.collections);

  t.deepEqual(res, { files });
});

test('should build collections with pattern longhand', async t => {

  const files = [
    { filename: 'files/foo/index.md' },
    { filename: 'files/bar.md' }
  ];

  const res = await new Barnes()
    .from(() => files)
    .use(collections({
      files: {
        pattern: 'files/**/*.md'
      }
    }))
    .all((_, barnes) => barnes.metadata.collections);

  t.deepEqual(res, { files });
});

test('should build collections from metadata', async t => {

  interface IHumdinger {
    filename: string;
    collection: string;
  }

  const humdingers: IHumdinger[] = [
    { filename: '1', collection: 'humdingers' },
    { filename: '2', collection: 'humdingers' }
  ];

  const res = await new Barnes()
    .use(() => humdingers)
    .use(collections())
    .all((_, barnes) => barnes.metadata.collections);

  t.deepEqual(res, { humdingers });
});