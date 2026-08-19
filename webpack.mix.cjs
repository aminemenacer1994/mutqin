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

function pruneMissingManifestEntries(manifest) {
    if (!manifest) return false;
    let changed = false;
    for (const key of Object.keys(manifest)) {
        const rel = key.replace(/^\//, '').split('?')[0];
        if (!fs.existsSync(path.join(publicDir, rel))) {
            delete manifest[key];
            changed = true;
        }
    }
    return changed;
}

// Resolve every lazy chunk filename referenced by the freshly emitted app.js
// runtime. Production builds map numeric ids -> chunk names in a minified
// template, so naive "131.hash.js" parsing deletes homepage.hash.js by mistake.
function collectReferencedChunkFiles(appJs) {
    const keep = new Set();

    for (const match of appJs.matchAll(/"([a-z0-9_-]+)":"([a-f0-9]{8})"/gi)) {
        keep.add(`${match[1]}.${match[2]}.js`);
    }

    for (const match of appJs.matchAll(/([a-z0-9_-]+)\.([a-f0-9]{8})\.js/gi)) {
        keep.add(`${match[1]}.${match[2]}.js`);
    }

    const chunkLoaderAnchor = 'js/"+({';
    const chunkLoaderStart = appJs.indexOf(chunkLoaderAnchor);
    if (chunkLoaderStart !== -1) {
        const chunkLoaderEnd = appJs.indexOf('}[e]+".js"', chunkLoaderStart);
        if (chunkLoaderEnd !== -1) {
            const chunkLoader = appJs.slice(chunkLoaderStart, chunkLoaderEnd + 10);
            const namesBody = chunkLoader.slice(
                chunkLoader.indexOf('({') + 2,
                chunkLoader.indexOf('}[e]||e)')
            );
            const hashesBody = chunkLoader.slice(
                chunkLoader.indexOf('+{', chunkLoader.indexOf('}[e]||e)')) + 2,
                chunkLoader.indexOf('}[e]+".js"')
            );
            const parseMap = (body) => {
                const map = {};
                for (const part of body.split(',')) {
                    const entry = part.match(/(\d+):"([^"]+)"/);
                    if (entry) map[entry[1]] = entry[2];
                }
                return map;
            };
            const names = parseMap(namesBody);
            const hashes = parseMap(hashesBody);
            for (const [id, hash] of Object.entries(hashes)) {
                keep.add(`${names[id] || id}.${hash}.js`);
            }
            return keep;
        }
    }

    for (const match of appJs.matchAll(/(\d+):"([a-f0-9]{8})"/g)) {
        keep.add(`${match[1]}.${match[2]}.js`);
    }

    return keep;
}

// Mix keeps prior contenthashed keys in memory across watch rebuilds. Our
// mix.then() prune deletes the old files from disk, then mix.version() tries
// to hash those ghost keys and ENOENTs. Strip missing entries before Mix's
// CustomTasksPlugin runs applyVersioning.
class PruneMissingManifestEntriesPlugin {
    apply(compiler) {
        const prune = () => {
            pruneMissingManifestEntries(
                global.Mix && global.Mix.manifest && global.Mix.manifest.manifest
            );
        };

        // Drop ghost keys before a watch rebuild accumulates another stale hash.
        compiler.hooks.watchRun.tap('PruneMissingManifestEntriesPlugin', prune);
        compiler.hooks.beforeRun.tap('PruneMissingManifestEntriesPlugin', prune);
        // Assets are on disk; manifest.transform() may have re-added stale keys.
        compiler.hooks.afterEmit.tap('PruneMissingManifestEntriesPlugin', prune);
        // stage -100 guarantees this runs before CustomTasksPlugin.applyVersioning.
        compiler.hooks.done.tap(
            { name: 'PruneMissingManifestEntriesPlugin', stage: -100 },
            prune
        );

        let patchedHash = false;
        compiler.hooks.beforeRun.tap('PruneMissingManifestEntriesPlugin', () => {
            if (patchedHash || !global.Mix || !global.Mix.manifest) return;
            patchedHash = true;
            const manifestApi = global.Mix.manifest;
            const hash = manifestApi.hash.bind(manifestApi);
            manifestApi.hash = function hashIfPresent(file) {
                const rel = file.replace(/^\//, '').split('?')[0];
                if (!fs.existsSync(path.join(publicDir, rel))) {
                    delete this.manifest[file];
                    return this;
                }
                return hash(file);
            };
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

    // Preserve every lazy chunk referenced by app.js and other manifest entries
    // (e.g. memorisation -> amd-modal). Scanning only app.js prunes nested chunks.
    let skipPrune = false;
    try {
        const referenced = new Set();
        const scanChunkReferences = (filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                for (const name of collectReferencedChunkFiles(content)) {
                    referenced.add(name);
                }
            } catch {
                /* ignore unreadable chunk */
            }
        };

        scanChunkReferences(path.join(jsDir, 'app.js'));
        for (const key of Object.keys(manifest)) {
            if (!key.startsWith('/js/')) continue;
            const base = path.basename(key.split('?')[0]);
            if (!base.endsWith('.js') || base === 'app.js') continue;
            scanChunkReferences(path.join(jsDir, base));
        }

        for (const name of referenced) {
            keepNames.add(name);
        }
        const missingReferenced = [...referenced].filter(
            (name) => !fs.existsSync(path.join(jsDir, name))
        );
        if (missingReferenced.length > 0) {
            skipPrune = true;
            console.warn(
                '[mix] Skipping chunk prune; runtime references missing files:',
                missingReferenced.join(', ')
            );
        }
    } catch {
        /* ignore */
    }

    try {
        fs.writeFileSync(manifestPath, `${JSON.stringify(pruned, null, 4)}\n`);
    } catch {
        /* ignore */
    }

    if (!skipPrune) {
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
    }
});
