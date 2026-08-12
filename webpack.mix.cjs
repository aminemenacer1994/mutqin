const fs = require('fs');
const path = require('path');
const mix = require('laravel-mix');

const manifestPath = path.join(__dirname, 'public/mix-manifest.json');
const publicDir = path.join(__dirname, 'public');
const jsDir = path.join(publicDir, 'js');

// Drop manifest entries whose files are gone. Otherwise mix.version() ENOENTs
// on stale contenthashed chunk names left over from a previous watch cycle.
function dropMissingManifestEntries() {
    if (!fs.existsSync(manifestPath)) return;
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return;
    }

    let changed = false;
    const next = {};
    for (const [key, value] of Object.entries(manifest)) {
        const rel = key.replace(/^\//, '').split('?')[0];
        if (fs.existsSync(path.join(publicDir, rel))) {
            next[key] = value;
        } else {
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 4)}\n`);
    }
}

dropMissingManifestEntries();

// Mix keeps prior contenthashed keys in memory across watch rebuilds. Our
// mix.then() prune deletes the old files from disk, then mix.version() tries
// to hash those ghost keys and ENOENTs. Strip missing entries before Mix's
// CustomTasksPlugin runs applyVersioning (done taps run in register order).
class PruneMissingManifestEntriesPlugin {
    apply(compiler) {
        compiler.hooks.done.tap('PruneMissingManifestEntriesPlugin', () => {
            const manifest = global.Mix && global.Mix.manifest && global.Mix.manifest.manifest;
            if (!manifest) return;
            for (const key of Object.keys(manifest)) {
                const rel = key.replace(/^\//, '').split('?')[0];
                if (!fs.existsSync(path.join(publicDir, rel))) {
                    delete manifest[key];
                }
            }
        });
    }
}

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
       },
       plugins: [new PruneMissingManifestEntriesPlugin()]
   })
   .override((webpackConfig) => {
       // Ensure our done-hook runs before CustomTasksPlugin.applyVersioning.
       const pruneIdx = webpackConfig.plugins.findIndex(
           (p) => p && p.constructor && p.constructor.name === 'PruneMissingManifestEntriesPlugin'
       );
       if (pruneIdx > 0) {
           const [plugin] = webpackConfig.plugins.splice(pruneIdx, 1);
           webpackConfig.plugins.unshift(plugin);
       }
   })
   .version();

// Contenthash builds otherwise accumulate multi-GB orphans under public/js.
// Keep app/css plus the newest file per hashed chunk family, prune the rest.
mix.then(() => {
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
            // Skip ghost entries so mix.version() is not fed missing paths next run.
            continue;
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
        // Named lazy chunks are mapped as JSON keys, e.g. "homepage":"05961901",
        // not as literal homepage.05961901.js strings in the runtime.
        for (const match of appJs.matchAll(/"([a-z0-9_-]+)":"([a-f0-9]{8})"/gi)) {
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
