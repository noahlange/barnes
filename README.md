# barnes

> turning things into things by way of other things since 2017

Barnes is a static site generator.  
Barnes is an asset pipeline.  
Barnes is also a general-purpose incremental building thingy.  
Barnes is not compatible with the previous version of a similar library of the same name.

It is all of these things.

(It's also basically Metalsmith, but in Typescript.)

Use it like this:

```typescript
import Barnes from 'barnes';
import { watch, write } from 'barnes-io';
import { livereload, serve } from 'barnes-dev';
import { gzip, imagemin, lqip, purge, penthouse } from 'barnes-optimize';
import { layouts, markdown, paths } from 'barnes-web';

await new Barnes(__dirname)
  .use(serve('dist'));
  .use(watch('src/content/**/*'))
  .use(watch('src/assets/**/*'))
  .use(markdown())
  .use(paths())
  .use(layouts({
    directory: 'src/views',
    default: 'layouts/index.njk',
    options: {
      engine: 'nunjucks',
      root: `${__dirname}/src/views`
    }
  }))
  .use(purge())
  .use(penthouse())
  .use(lqip())
  .use(imagemin())
  .use(gzip())
  .use(write('dist'))
  .use(livereload())
```

Or (theoretically) like this!

```typescript
const content = new Barnes(_)
  .use(watch('src/content/**/*'))
  .use(markdown())
  .use(paths())
  .use(layouts({
    directory: 'src/views',
    default: 'layouts/index.njk',
    options: {
      engine: 'nunjucks',
      root: `${_}/src/views`
    }
  }))

const assets = new Barnes(_)
  .use(watch('src/assets/**/*'))
  .use(someKindOfPreprocessor());

const optimize = files => (
  new Barnes(_)
    .from(() => files)
    .use(purge())
    .use(penthouse())
    .use(lqip())
    .use(imagemin())
    .use(gzip());
);

await new Barnes(_)
  .serve('dist')
  .use(content)
  .use(assets)
  .use(optimize)
  .write('dist')
  .use('livereload');
```
