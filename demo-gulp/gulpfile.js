import gulp from "gulp";
import * as sass from "sass";
import gulpSass from "gulp-sass";
import sourcemaps from "gulp-sourcemaps";
import cleanCSS from "gulp-clean-css";
import rename from "gulp-rename";
import browserSync from "browser-sync";

const sassCompiler = gulpSass(sass);
const bs = browserSync.create();

const paths = {
  scss: "src/scss/**/*.scss",
  scssEntry: "src/scss/style.scss",
  cssDest: "build/assets/css",
  build: "build/**/*",
};

export function styles() {
  return gulp
    .src(paths.scssEntry)
    .pipe(sourcemaps.init())
    .pipe(sassCompiler().on("error", sassCompiler.logError))
    .pipe(gulp.dest(paths.cssDest))
    .pipe(bs.stream())
    .pipe(cleanCSS())
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(paths.cssDest));
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

export function watchFiles() {
  gulp.watch(paths.scss, styles);
  gulp.watch(paths.build).on("change", bs.reload);
}

export default gulp.series(styles, gulp.parallel(serve, watchFiles));
