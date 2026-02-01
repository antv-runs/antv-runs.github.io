import gulp from "gulp";
import * as sass from "sass";
import gulpSass from "gulp-sass";
import sourcemaps from "gulp-sourcemaps";
import cleanCSS from "gulp-clean-css";
import rename from "gulp-rename";
import htmlmin from "gulp-htmlmin";
import { deleteAsync } from "del";
import browserSync from "browser-sync";

const sassCompiler = gulpSass(sass);
const bs = browserSync.create();

const paths = {
  scss: "src/assets/scss/**/*.scss",
  cssDest: "build/assets/css",
  html: "src/**/*.html",
  htmlDest: "build/",
  assets: "src/assets/**/*",
  assetsDest: "build/assets",
};

export function clean() {
  return deleteAsync(["build"]);
}

export function styles() {
  return gulp
    .src("src/assets/scss/style.scss")
    .pipe(sourcemaps.init())
    .pipe(sassCompiler().on("error", sassCompiler.logError))
    .pipe(gulp.dest(paths.cssDest))
    .pipe(bs.stream())
    .pipe(cleanCSS())
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(paths.cssDest));
}

export function html() {
  return gulp
    .src(paths.html)
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest(paths.htmlDest))
    .pipe(bs.reload({ stream: true })); // 👈 reload browser
}

export function copyAssets() {
  return gulp
    .src(paths.assets)
    .pipe(gulp.dest(paths.assetsDest))
    .pipe(bs.reload({ stream: true })); // 👈 reload browser
}

export function watchFiles() {
  gulp.watch(paths.scss, styles);
  gulp.watch(paths.html, html);
  gulp.watch("src/assets/js/**/*.js", copyAssets);
  gulp.watch("src/assets/images/**/*", copyAssets);
}

export function serve() {
  bs.init({
    server: {
      baseDir: "build",
    },
    port: 3000,
    open: true,
  });
}

export default gulp.series(
  clean,
  gulp.parallel(styles, html, copyAssets),
  gulp.parallel(serve, watchFiles),
);
