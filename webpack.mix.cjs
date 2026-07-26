const mix = require('laravel-mix');

mix.js('resources/js/app.js', 'public/js')
   .vue()
   .sass('resources/sass/app.scss', 'public/css')
   .options({
       progress: false
   })
   .webpackConfig({
       output: {
           // Contenthash so browsers cannot keep a stale memorisation chunk forever.
           // (Stable `memorisation.js` was cached indefinitely by Safari/Chrome.)
           chunkFilename: 'js/[name].[contenthash:8].js'
       }
   })
   .version();
