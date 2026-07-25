const mix = require('laravel-mix');

mix.js('resources/js/app.js', 'public/js')
   .vue()
   .sass('resources/sass/app.scss', 'public/css')
   .options({
       progress: false
   })
   .webpackConfig({
       output: {
           // Stable chunk name. Cache bust via mix.version() on app.js + no-store headers.
           // Contenthashed chunk names raced with `mix watch` and blanked the workspace.
           chunkFilename: 'js/[name].js'
       }
   })
   .version();
