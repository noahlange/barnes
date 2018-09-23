import test from 'ava';
import Barnes from '../barnes';

test('min, max, sort', async t => {
  const max = await new Barnes()
    .from(() => [1, 2, 3, 4, 5])
    .max((a, b) => a - b);

  const min = await new Barnes()
    .from(() => [1, 2, 3, 4, 5])
    .min((a, b) => a - b);

  const sorted = await new Barnes()
    .from(() => ['fee', 'fi', 'fo', 'fum'])
    .sort((a, b) => a.localeCompare(b));

  t.is(max, 5);
  t.is(min, 1);
  t.deepEqual(sorted, ['fee', 'fi', 'fo', 'fum']);
});

test('find, findLast', async t => {
  const four = await new Barnes()
    .from(() => [1, 2, 3, 4, 5, 1])
    .find(v => v > 3);

  const five = await new Barnes()
    .from(() => [1, 2, 3, 4, 5, -1])
    .findLast(v => v > 0);

  t.is(four, 4);
  t.is(five, 5);
});

test('take, takeWhile, takeLast', async t => {
  const one = await new Barnes()
    .from(() => [1, 2, 3, 4, 5])
    .take(3)
    .map(n => n ** 2);

  const two = await new Barnes()
    .from(() => [1, 2, 3, 4, 5])
    .takeWhile(n => n < 4)
    .map(n => n ** 2);

  const three = await new Barnes()
    .from(() => [1, 2, 3, 4, 5])
    .takeLast(3)
    .map(n => n ** 2);

  t.deepEqual(one, [1, 4, 9]);
  t.deepEqual(two, [1, 4, 9]);
  t.deepEqual(three, [9, 16, 25]);
});

test('count', async t => {
  const res = await new Barnes().from(() => [1, 2, 3]).count();
  t.is(res, 3);
});

test('tap', async t => {
  const out = [];
  await new Barnes().from(() => [1, 2, 3, 4, 5]).tap(n => out.push(n));

  t.deepEqual(out, [1, 2, 3, 4, 5]);
});
