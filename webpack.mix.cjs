const mix = require('laravel-mix');

mix.js('resources/js/app.js', 'public/js')
   .vue()
   .sass('resources/sass/app.scss', 'public/css')
   .options({
       progress: false
   })
   .webpackConfig({
       output: {
           // Bust browser caches for lazy Vue chunks (Memorisation, locales, etc.).
           chunkFilename: mix.inProduction()
               ? 'js/[name].[chunkhash:8].js'
               : 'js/[name].js'
       }
   })
   .version();
