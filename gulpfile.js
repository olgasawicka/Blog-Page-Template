"use strict";

const gulp = require("gulp"),
  bower = require("gulp-bower"),
  inject = require("gulp-inject"),
  wiredep = require("wiredep").stream,
  browserSync = require("browser-sync").create(),
  sass = require("gulp-sass"),
  autoprefixer = require("gulp-autoprefixer"),
  babel = require("gulp-babel"),
  injectPartials = require("gulp-inject-partials"),
  merge = require("merge-stream"),
  del = require("del"),
  uglify = require("gulp-uglify"),
  cssmin = require("gulp-cssmin"),
  rename = require("gulp-rename"),
  replace = require("gulp-html-replace"),
  strip = require("gulp-strip-comments"),
  handlebars = require("handlebars"),
  fs = require("fs");

const cheerio = require("cheerio");
let $;

const testFolder = "./src/hbs_partials/";
const hbsPartialsList = [];

const sources = ["dev/js/**/*.js", "dev/css/**/*.css"];

gulp.task("clean", (done) => {
  del.sync(["dev"]);
  done();
});

gulp.task("sass", () => {
  return gulp
    .src("src/scss/*.scss")
    .pipe(sass({}))
    .on("error", (err) => {
      console.log(err.toString());
      this.emit("end");
    })
    .pipe(
      autoprefixer(["last 15 versions", "> 1%", "ie 8", "ie 7"], {
        cascade: true,
      })
    )
    .pipe(cssmin())
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(gulp.dest("dev/css"))
    .pipe(
      browserSync.reload({
        stream: true,
      })
    );
});

gulp.task("js", () => {
  return gulp
    .src("src/js/**/*.js")
    .pipe(
      babel({
        presets: ["es2015"],
      })
    )
    .pipe(uglify())
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(gulp.dest("dev/js"));
});

gulp.task("images", () => {
  return gulp.src("src/img/**/*").pipe(gulp.dest("dev/img"));
});

gulp.task("bower_components", () => {
  return gulp
    .src("src/bower_components/**/**")
    .pipe(gulp.dest("dev/bower_components"));
});

gulp.task("inject_html_partials", () => {
  return gulp
    .src("src/index.html")
    .pipe(injectPartials())
    .pipe(rename("index_temp.html"))
    .pipe(gulp.dest("src"));
});

gulp.task(
  "register_hbs_partials",
  gulp.series("inject_html_partials", (done) => {
    let registeredPartials = [];
    fs.readFile("./src/index_temp.html", (error, data) => {
      if (data) {
        $ = cheerio.load(data, {
          decodeEntities: false,
        });
        if ($.html()) {
          hbsPartialsList.forEach((id) => {
            let file = "./src/hbs_partials/" + id + ".html";
            fs.readFile(file, (error, data) => {
              let partial = cheerio.load(data, {
                decodeEntities: false,
              });
              if (partial.html()) {
                handlebars.registerPartial(id, partial.html());
                registeredPartials.push(id);
                if (hbsPartialsList.length === registeredPartials.length) {
                  done();
                }
              }
            });
          });
        }
      }
    });
  })
);

gulp.task(
  "render_content",
  gulp.series("register_hbs_partials", (done) => {
    delete require.cache[require.resolve("./src/json/data.json")];
    let json = require("./src/json/data.json");
    let createRowSection = (scriptId, content) => {
      let template = $("#" + scriptId).html();
      let compiledTemplate = handlebars.compile(template);
      $("#inner-content2").append(compiledTemplate(content));
    };

    // --------- Get each item from json.content object
    let contentOrder = [];
    json.content.forEach((item, index) => {
      contentOrder.push(item);
      contentOrder.sort((a, b) => a.index - b.index);
    });

    contentOrder.forEach((item, index) => {
      let scriptId = "row-section-" + index;

      $("#inner-content2").append(
        '<script id="' +
          scriptId +
          '" type="text/x-handlebars-template">{{> ' +
          item.partial +
          "}}</script>"
      );

      createRowSection(scriptId, item);

      if (index === contentOrder.length - 1) {
        $('script[type="text/x-handlebars-template"]').remove();
        fs.writeFile("./dev/index.html", $.html(), (error) => {
          if (error) {
            throw error;
          } else {
            done();
          }
        });
      }
    });
  })
);

gulp.task("readDir", (done) => {
  fs.readdir(testFolder, (err, files) => {
    files.forEach((file) => {
      hbsPartialsList.push(file.replace(/\.[^.$]+$/, ""));
    });
    done();
  });
});

gulp.task(
  "html",
  gulp.series("render_content", () => {
    return gulp
      .src("dev/index.html")
      .pipe(
        inject(
          gulp.src(sources, {
            read: false,
          }),
          {
            ignorePath: "dev",
            addRootSlash: false,
          }
        )
      )
      .pipe(
        wiredep({
          ignorePath: "../src/",
        })
      )
      .pipe(rename("index.html"))
      .pipe(gulp.dest("dev"))
      .on("end", () => {
        gulp.parallel(["clean_index_temp", "strip_comments"]);
      });
  })
);

gulp.task("clean_index_temp", (done) => {
  del.sync(["src/index_temp.html"]);
  done();
});

gulp.task("strip_comments", () => {
  return gulp.src("dev/index.html").pipe(strip()).pipe(gulp.dest("dev"));
});

gulp.task("browser_sync", () => {
  browserSync.init({
    livereload: true,
    reloadDelay: 300,
    server: {
      baseDir: "dev",
      index: "index.html",
    },
  });
});

gulp.task("watch", () => {
  gulp
    .watch(["src/**/*.html", "!src/index_temp.html", "src/json/*"])
    .on("change", gulp.series("html", browserSync.reload));
  gulp
    .watch("src/scss/*.scss")
    .on("change", gulp.series("sass", browserSync.reload));
  gulp
    .watch("src/img/**/*", gulp.parallel("images"))
    .on("change", gulp.series("images", browserSync.reload));
  gulp
    .watch("src/js/**/*.js", gulp.parallel("js"))
    .on("change", gulp.series("js", browserSync.reload));
});

gulp.task(
  "default",
  gulp.series(
    "clean",
    "sass",
    "js",
    "images",
    "bower_components",
    "readDir",
    "html",
    gulp.parallel("browser_sync", "watch")
  )
);
