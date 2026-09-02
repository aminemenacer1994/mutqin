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

    for (const match of appJs.matchAll(/([a-z][a-z0-9_-]*)\.([a-f0-9]{8})\.js/gi)) {
        keep.add(`${match[1]}.${match[2]}.js`);
    }

    // Watch/dev runtime: __webpack_require__.e(/*! import() | dashboard */ "dashboard")
    // → public/js/dashboard.js. Without these, a production prune + watch restart
    // leaves app.js requesting stable names that no longer exist on disk.
    for (const match of appJs.matchAll(
        /__webpack_require__\.e\(\s*(?:\/\*[\s\S]*?\*\/\s*)?["']([a-z][a-z0-9_-]*)["']/gi
    )) {
        keep.add(`${match[1]}.js`);
    }

    // Webpack 5 / Mix production templates look like:
    //   "js/"+{131:"homepage",...}[e]+"."+{131:"20283d40",...}[e]+".js"
    // Older builds used an extra paren: "js/"+({...}[e]||e)+"."+{...}
    const chunkLoaderAnchors = ['js/"+({', 'js/"+{'];
    for (const chunkLoaderAnchor of chunkLoaderAnchors) {
        const chunkLoaderStart = appJs.indexOf(chunkLoaderAnchor);
        if (chunkLoaderStart === -1) continue;

        const namesOpen = appJs.indexOf('{', chunkLoaderStart);
        const namesClose = appJs.indexOf('}[e]', namesOpen);
        if (namesOpen === -1 || namesClose === -1) continue;

        const hashesOpenMarker = appJs.indexOf('+{', namesClose);
        if (hashesOpenMarker === -1) continue;
        const hashesOpen = appJs.indexOf('{', hashesOpenMarker);
        const hashesClose = appJs.indexOf('}[e]+".js"', hashesOpen);
        if (hashesOpen === -1 || hashesClose === -1) continue;

        const namesBody = appJs.slice(namesOpen + 1, namesClose);
        const hashesBody = appJs.slice(hashesOpen + 1, hashesClose);
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

// Hidden production source maps (no sourceMappingURL in public JS).
// mix.then() moves *.map out of public/ so browsers cannot fetch them.
if (mix.inProduction()) {
    mix.sourceMaps(false, 'hidden-source-map');
}

mix.js('resources/js/app.js', 'public/js')
   .vue()
   .sass('resources/sass/app.scss', 'public/css')
   .options({
       progress: false
   })
   .webpackConfig({
       output: {
           // Production: contenthash so browsers cannot keep a stale memorisation
           // chunk forever. Watch/dev: stable names — contenthash in watch mode
           // updates app.js's chunk map before (or without) re-emitting unchanged
           // async chunks, which causes ChunkLoadError 404s (e.g. homepage.*.js).
           chunkFilename: mix.inProduction()
               ? 'js/[name].[contenthash:8].js'
               : 'js/[name].js'
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
// Keep app/css plus the newest N files per hashed chunk family so an in-place
// deploy does not delete chunks still referenced by tabs on the previous HTML.
const KEEP_CHUNK_GENERATIONS = 2;

mix.then(() => {
    if (!fs.existsSync(manifestPath) || !fs.existsSync(jsDir)) return;

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return;
    }

    const alwaysKeepKeys = new Set();
    for (const key of Object.keys(manifest)) {
        const base = path.basename(key.split('?')[0]);
        if (base === 'app.js' || base === 'app.css') {
            alwaysKeepKeys.add(key);
        }
    }

    /** @type {Map<string, Array<{ name: string, mtime: number }>>} */
    const generationsByFamily = new Map();
    try {
        for (const entry of fs.readdirSync(jsDir, { withFileTypes: true })) {
            if (!entry.isFile()) continue;
            if (!/\.[a-f0-9]{8}\.js$/i.test(entry.name)) continue;
            const family = entry.name.replace(/\.[a-f0-9]{8}\.js$/i, '');
            let mtime = 0;
            try {
                mtime = fs.statSync(path.join(jsDir, entry.name)).mtimeMs;
            } catch {
                continue;
            }
            const list = generationsByFamily.get(family) || [];
            list.push({ name: entry.name, mtime });
            generationsByFamily.set(family, list);
        }
    } catch {
        /* ignore */
    }

    const keepNames = new Set(['app.js', 'app.css']);
    for (const list of generationsByFamily.values()) {
        list.sort((a, b) => b.mtime - a.mtime);
        for (const entry of list.slice(0, KEEP_CHUNK_GENERATIONS)) {
            keepNames.add(entry.name);
        }
    }

    // Always keep every lazy chunk the current app.js runtime can request.
    let skipPrune = false;
    const referenced = new Set();
    try {
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
        for (const name of [...referenced]) {
            scanChunkReferences(path.join(jsDir, name));
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

    // Rewrite manifest: entry points Mix versioned + live hashed chunks we keep.
    const pruned = {};
    for (const key of alwaysKeepKeys) {
        pruned[key] = manifest[key];
    }
    for (const name of [...keepNames].sort()) {
        if (name === 'app.js' || name === 'app.css') continue;
        if (!/\.js$/i.test(name)) continue;
        const key = `/js/${name}`;
        pruned[key] = key;
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
            // Remove stale JS, maps, and webpack LICENSE sidecars.
            const isJs = /\.js$/i.test(name);
            const isMap = /\.js\.map$/i.test(name);
            const isLicense = /\.js\.LICENSE\.txt$/i.test(name);
            if (!isJs && !isMap && !isLicense) continue;

            const bare = name
                .replace(/\.LICENSE\.txt$/i, '')
                .replace(/\.map$/i, '');
            if (keepNames.has(bare) || keepNames.has(name)) continue;
            // Dev/watch stable names that are not contenthashed.
            if (/^[a-z0-9_-]+\.js$/i.test(bare) && bare !== 'app.js') {
                // Drop leftover watch-mode chunks in production builds only.
                if (!mix.inProduction()) continue;
            }

            try {
                fs.unlinkSync(path.join(jsDir, name));
            } catch {
                /* ignore busy/locked files during watch */
            }
        }
    }

    if (mix.inProduction()) {
        relocateSourceMaps(publicDir, path.join(__dirname, 'storage/app/sourcemaps'));
    }
});

function relocateSourceMaps(fromDir, destDir) {
    try {
        fs.mkdirSync(destDir, { recursive: true });
    } catch {
        return;
    }

    const walk = (dir) => {
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(abs);
                continue;
            }
            if (!entry.isFile() || !entry.name.endsWith('.map')) continue;
            const rel = path.relative(fromDir, abs);
            const target = path.join(destDir, rel);
            try {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.renameSync(abs, target);
            } catch {
                /* ignore locked maps during watch */
            }
        }
    };

    walk(path.join(fromDir, 'js'));
    walk(path.join(fromDir, 'css'));
}
