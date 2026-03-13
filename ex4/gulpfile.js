import gulp from "gulp";
import * as sass from "sass";
import gulpSass from "gulp-sass";
import sourcemaps from "gulp-sourcemaps";
import cleanCSS from "gulp-clean-css";
import rename from "gulp-rename";
import replace from "gulp-replace";
import htmlmin from "gulp-htmlmin";
import browserSync from "browser-sync";
import { deleteAsync } from "del";
import path from "node:path";
import fs from "node:fs";
import { Transform } from "node:stream";
import { pathToFileURL } from "node:url";

const sassCompiler = gulpSass(sass);
const bs = browserSync.create();

const paths = {
  src: {
    html: "src/**/*.html",
    scss: "src/scss/**/*.scss",
    scssEntry: "src/scss/style.scss",
    js: "src/assets/js/**/*.js",
    images: "src/assets/images/**/*.{png,jpg,jpeg,webp,svg,gif,avif,ico}",
    fonts: "src/assets/fonts/**/*",
    data: "src/assets/data/**/*",
  },
  out: {
    root: "build",
    css: "build/assets/css",
    js: "build/assets/js",
    images: "build/assets/images",
    fonts: "build/assets/fonts",
    data: "build/assets/data",
  },
};

const devAliasMap = [
  { from: /~\/css\//g, to: "./assets/css/" },
  { from: /~\/js\//g, to: "./assets/js/" },
  { from: /~\/images\//g, to: "./assets/images/" },
  { from: /~\/fonts\//g, to: "./assets/fonts/" },
  { from: /~\/data\//g, to: "./assets/data/" },
];

const buildAliasMap = [
  { from: /~\/css\//g, to: "./assets/css/" },
  { from: /~\/js\//g, to: "./assets/js/" },
  { from: /~\/images\//g, to: "./assets/images/" },
  { from: /~\/fonts\//g, to: "./assets/fonts/" },
  { from: /~\/data\//g, to: "./assets/data/" },
];

const devCssAliasMap = [
  { from: /~\/images\//g, to: "../images/" },
  { from: /~\/fonts\//g, to: "../fonts/" },
];

const buildCssAliasMap = [
  { from: /~\/images\//g, to: "../images/" },
  { from: /~\/fonts\//g, to: "../fonts/" },
];

function applyReplacements(stream, replacements) {
  return replacements.reduce(
    (current, item) => current.pipe(replace(item.from, item.to)),
    stream,
  );
}

function createImageCopyLogger() {
  return new Transform({
    objectMode: true,
    transform(file, _encoding, callback) {
      const relativePath = path.relative(process.cwd(), file.path);
      const size = Buffer.isBuffer(file.contents) ? file.contents.length : 0;
      console.log(`[images:copy] ${relativePath} (${size} bytes)`);
      callback(null, file);
    },
  });
}

function createImageSizeVerifier() {
  return new Transform({
    objectMode: true,
    transform(file, _encoding, callback) {
      const sourcePath = path.resolve("src/assets/images", file.relative);
      const destinationPath = path.resolve(paths.out.images, file.relative);

      const sourceSize = fs.statSync(sourcePath).size;
      const destinationSize = fs.statSync(destinationPath).size;

      if (sourceSize !== destinationSize) {
        callback(
          new Error(
            `[images:verify] Size mismatch for ${file.relative}: src=${sourceSize}, dest=${destinationSize}`,
          ),
        );
        return;
      }

      console.log(
        `[images:verify] ${file.relative} OK (${destinationSize} bytes)`,
      );
      callback(null, file);
    },
  });
}

function resolveScssAlias(url) {
  if (!url.startsWith("~/scss/")) {
    return null;
  }

  const sourcePath = path.resolve("src", url.slice(2));
  const fileName = path.basename(sourcePath);
  const dirName = path.dirname(sourcePath);
  const candidates = [
    sourcePath,
    `${sourcePath}.scss`,
    path.join(dirName, `_${fileName}.scss`),
    path.join(sourcePath, "index.scss"),
    path.join(sourcePath, "_index.scss"),
  ];

  const resolved = candidates.find((candidatePath) =>
    fs.existsSync(candidatePath),
  );
  return resolved ? pathToFileURL(resolved) : null;
}

const scssAliasImporter = {
  findFileUrl(url) {
    return resolveScssAlias(url);
  },
};

export function clean() {
  return deleteAsync([paths.out.root]);
}

function htmlTask({ dev }) {
  const replacements = dev ? devAliasMap : buildAliasMap;
  let stream = applyReplacements(gulp.src(paths.src.html), replacements);

  if (!dev) {
    stream = stream.pipe(
      htmlmin({
        collapseWhitespace: true,
        removeComments: true,
      }),
    );
  }

  return stream.pipe(gulp.dest(paths.out.root));
}

export function htmlDev() {
  return htmlTask({ dev: true });
}

export function htmlBuild() {
  return htmlTask({ dev: false });
}

function stylesTask({ dev }) {
  const replacements = dev ? devCssAliasMap : buildCssAliasMap;

  let stream = applyReplacements(
    gulp
      .src(paths.src.scssEntry)
      .pipe(sourcemaps.init())
      .pipe(
        sassCompiler({
          importers: [scssAliasImporter],
        }).on("error", sassCompiler.logError),
      ),
    replacements,
  ).pipe(gulp.dest(paths.out.css));

  if (!dev) {
    stream = stream
      .pipe(cleanCSS())
      .pipe(rename({ suffix: ".min" }))
      .pipe(sourcemaps.write("."))
      .pipe(gulp.dest(paths.out.css));
  }

  return stream.pipe(bs.stream());
}

export function stylesDev() {
  return stylesTask({ dev: true });
}

export function stylesBuild() {
  return stylesTask({ dev: false });
}

function scriptsTask({ dev }) {
  const replacements = dev ? devAliasMap : buildAliasMap;
  return applyReplacements(gulp.src(paths.src.js), replacements).pipe(
    gulp.dest(paths.out.js),
  );
}

export function scriptsDev() {
  return scriptsTask({ dev: true });
}

export function scriptsBuild() {
  return scriptsTask({ dev: false });
}

export function images() {
  // Gulp 5 defaults to text encoding; force binary mode for non-text assets.
  return gulp
    .src(paths.src.images, { encoding: false })
    .pipe(createImageCopyLogger())
    .pipe(gulp.dest(paths.out.images))
    .pipe(createImageSizeVerifier());
}

export function fonts() {
  return gulp.src(paths.src.fonts).pipe(gulp.dest(paths.out.fonts));
}

function dataTask({ dev }) {
  const replacements = dev ? devAliasMap : buildAliasMap;
  return applyReplacements(gulp.src(paths.src.data), replacements).pipe(
    gulp.dest(paths.out.data),
  );
}

export function dataDev() {
  return dataTask({ dev: true });
}

export function dataBuild() {
  return dataTask({ dev: false });
}

export const build = gulp.series(
  clean,
  gulp.parallel(htmlBuild, stylesBuild, scriptsBuild, images, fonts, dataBuild),
);

export const dev = gulp.series(
  clean,
  gulp.parallel(htmlDev, stylesDev, scriptsDev, images, fonts, dataDev),
);

// Task aliases for common naming in watch/dev mode.
export const html = htmlDev;
export const scss = stylesDev;
export const js = scriptsDev;
export const assets = gulp.parallel(images, fonts, scriptsDev, dataDev);

export function serve() {
  bs.init({
    server: {
      baseDir: "build",
    },
    port: 3000,
    open: true,
  });
}

export function watchFiles() {
  gulp.watch(paths.src.scss, stylesDev);
  gulp.watch(
    paths.src.html,
    gulp.series(htmlDev, (done) => {
      bs.reload();
      done();
    }),
  );
  gulp.watch(
    paths.src.js,
    gulp.series(scriptsDev, (done) => {
      bs.reload();
      done();
    }),
  );
  gulp.watch(
    paths.src.images,
    gulp.series(images, (done) => {
      bs.reload();
      done();
    }),
  );
  gulp.watch(
    paths.src.fonts,
    gulp.series(fonts, stylesDev, (done) => {
      bs.reload();
      done();
    }),
  );
  gulp.watch(
    paths.src.data,
    gulp.series(dataDev, (done) => {
      bs.reload();
      done();
    }),
  );
}

export default gulp.series(dev, gulp.parallel(serve, watchFiles));
