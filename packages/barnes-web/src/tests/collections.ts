import test from 'ava';
import Barnes from 'barnes';
import collections from '../collections';

test('should build collections with pattern shorthand', async t => {
  const files = [
    { filename: 'files/bar.md' },
    { filename: 'files/foo/index.md' }
  ];

  const res = await new Barnes()
    .from(() => files)
    .use(
      collections({
        files: 'files/**/*.md'
      })
    )
    .all((_, barnes) => barnes.metadata.collections);

  t.deepEqual(res, { files });
});

test('should build collections with pattern longhand', async t => {
  const files = [
    { filename: 'files/bar.md' },
    { filename: 'files/foo/index.md' }
  ];

  const res = await new Barnes()
    .from(() => files)
    .use(
      collections({
        files: {
          pattern: 'files/**/*.md'
        }
      })
    )
    .all((_, barnes) => barnes.metadata.collections);

  t.deepEqual(res, { files });
});

test('should build collections from metadata', async t => {
  interface IHumdinger {
    filename: string;
    collection: string;
  }

  const humdingers: IHumdinger[] = [
    { filename: '2', collection: 'humdingers' },
    { filename: '1', collection: 'humdingers' }
  ];

  const res = await new Barnes()
    .use(() => humdingers)
    .use(collections())
    .all((_, barnes) => barnes.metadata.collections);

  t.deepEqual(res, { humdingers: humdingers.reverse() });
});

test('should build multiple collections', async t => {
  const humdingers = [
    { filename: '1', collection: 'humdingers' },
    { filename: '2', collection: 'humdingers' }
  ];

  const files = [
    { filename: 'files/foo/index.md' },
    { filename: 'files/bar.md' },
    { filename: 'file/boo.md' }
  ];

  const res = await new Barnes()
    .use(() => [...humdingers, ...files])
    .use(collections({ files: 'files/**/*' }))
    .all((_, barnes) => barnes.metadata.collections.files)
    .count();

  t.deepEqual(res, 2);
});
