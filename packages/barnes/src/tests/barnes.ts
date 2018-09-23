import test from 'ava';
import Barnes, { plugin, Plugin } from '../barnes';

const from = () => [1, 2, 3, 4, 5];

test('barnes in barnes in barnes', async t => {
  const one = new Barnes().from(() => [1, 2, 3, 4, 5]);
  const two = new Barnes().from(() => [1, 2, 3, 4, 5]);

  const three = await new Barnes()
    .use(one)
    .use(two)
    .reduce((a, b) => a + b, 0);

  t.is(three, 30);
});

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

test('reverse', async t => {
  const out = await new Barnes().from(() => [1, 2, 3, 4, 5]).reverse();
  t.deepEqual(out, [5, 4, 3, 2, 1]);
});

test('take & co.', async t => {
  const one = await new Barnes().from(from).take(3);
  const two = await new Barnes().from(from).takeLast(3);
  const three = await new Barnes().from(from).takeUntil(n => n > 3);
  const four = await new Barnes().from(from).takeWhile(n => n <= 3);
  t.deepEqual(one, [1, 2, 3]);
  t.deepEqual(two, [3, 4, 5]);
  t.deepEqual(three, [1, 2, 3]);
  t.deepEqual(four, [1, 2, 3]);
});

test('use should accept plugin', async t => {
  const a = await new Barnes().use(plugin(() => [1, 2, 3], Plugin.FROM));
  const b = await new Barnes()
    .from(from)
    .use(all => all.map(n => n * 5))
    .take(2);
  t.deepEqual(a, [1, 2, 3]);
  t.deepEqual(b, [5, 10]);
});
