const fs = require('fs');
const path = require('path');
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

// Contenthash builds otherwise accumulate multi-GB orphans under public/js.
// Keep app/css plus the newest file per hashed chunk family, prune the rest.
mix.then(() => {
    const manifestPath = path.join(__dirname, 'public/mix-manifest.json');
    const publicDir = path.join(__dirname, 'public');
    const jsDir = path.join(publicDir, 'js');
    if (!fs.existsSync(manifestPath) || !fs.existsSync(jsDir)) return;

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return;
    }

    const newestByFamily = new Map();
    const alwaysKeepKeys = new Set();

    for (const [key, value] of Object.entries(manifest)) {
        if (!key.startsWith('/js/') && !key.startsWith('/css/')) continue;
        const base = path.basename(key.split('?')[0]);
        if (base === 'app.js' || base === 'app.css') {
            alwaysKeepKeys.add(key);
            continue;
        }
        const family = base.replace(/\.[a-f0-9]{8}\.js$/i, '') || base;
        const abs = path.join(publicDir, key.replace(/^\//, '').split('?')[0]);
        let mtime = 0;
        try {
            mtime = fs.statSync(abs).mtimeMs;
        } catch {
            mtime = 0;
        }
        const prev = newestByFamily.get(family);
        if (!prev || mtime >= prev.mtime) {
            newestByFamily.set(family, { key, value, mtime, base });
        }
    }

    const pruned = {};
    for (const key of alwaysKeepKeys) {
        pruned[key] = manifest[key];
    }
    for (const entry of newestByFamily.values()) {
        pruned[entry.key] = entry.value;
    }

    const keepNames = new Set(
        Object.keys(pruned).map((key) => path.basename(key.split('?')[0]))
    );
    keepNames.add('app.js');

    // Preserve hashes referenced by the freshly built runtime (includes unnamed
    // split chunks like 52.abc12345.js that mix-manifest does not list).
    try {
        const appJs = fs.readFileSync(path.join(jsDir, 'app.js'), 'utf8');
        for (const match of appJs.matchAll(/(\d+):"([a-f0-9]{8})"/g)) {
            keepNames.add(`${match[1]}.${match[2]}.js`);
        }
        for (const match of appJs.matchAll(/([a-z0-9-]+)\.([a-f0-9]{8})\.js/gi)) {
            keepNames.add(`${match[1]}.${match[2]}.js`);
        }
    } catch {
        /* ignore */
    }

    try {
        fs.writeFileSync(manifestPath, `${JSON.stringify(pruned, null, 4)}\n`);
    } catch {
        /* ignore */
    }

    for (const entry of fs.readdirSync(jsDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const name = entry.name;
        if (!/\.js(\.map)?$/.test(name)) continue;
        const bare = name.replace(/\.map$/, '');
        if (keepNames.has(bare) || keepNames.has(name)) continue;
        // Numeric split chunks are required by the webpack runtime.
        if (/^\d+\.[a-f0-9]{8}\.js$/i.test(bare)) continue;
        try {
            fs.unlinkSync(path.join(jsDir, name));
        } catch {
            /* ignore busy/locked files during watch */
        }
    }
});
