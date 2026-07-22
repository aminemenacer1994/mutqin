const mix = require('laravel-mix');

mix.js('resources/js/app.js', 'public/js')
   .vue()
   .sass('resources/sass/app.scss', 'public/css')
   .options({
       progress: false
   })
   .webpackConfig({
       output: {
           // Stable lazy-chunk names. Cache busting comes from mix.version()
           // on the entry (app.js embeds the chunk mapping) — hashed chunk
           // filenames caused mix-manifest / watch mismatches and stale loads.
           chunkFilename: 'js/[name].js'
       }
   })
   .version();
