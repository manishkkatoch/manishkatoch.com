const { DateTime } = require("luxon");
const Nunjucks = require("nunjucks");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const Image = require("@11ty/eleventy-img");
const pluginSEO = require("eleventy-plugin-seo");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const pluginNavigation = require("@11ty/eleventy-navigation");
const customBlock = require('markdown-it-custom-block');
const { pathToFileURL } = require("url");
const { randomBytes } = require("crypto");

module.exports = function(eleventyConfig) {

  const nunjucksEnvironment = new Nunjucks.Environment(
    new Nunjucks.FileSystemLoader(["_includes","."]), // we need to pass in our includes dir here
    {
      lstripBlocks: true,
      trimBlocks: true,
      autoescape: false
    }
  );

  eleventyConfig.setLibrary("njk", nunjucksEnvironment);
  eleventyConfig.addFilter('readFile', (src) => {
    console.log("src => ", src, process.cwd(), path.resolve(src));
    return fs.readFileSync(path.resolve(src));
  });

  eleventyConfig.setDataDeepMerge(true);

  
  eleventyConfig.addLayoutAlias("post", "layouts/post.njk");
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginSEO, {
    title: "Manish Katoch",
    site_name: "Manish Katoch",
    description: "A collection of learnings of Manish Katoch",
    url: "https://www.manishkatoch.com",
    author: "Manish Katoch",
    twitter: "m_the_katoch"
  });
  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
  });

  // // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string

  eleventyConfig.addFilter('shift', (arr) => {
    arr.shift()
    return arr;
  });

  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });

  eleventyConfig.addFilter('featured', (collections) => {
    let featuredCollection = collections.filter(c => c.data.tags.indexOf('featured') > 0);
    let others = collections.filter(c => c.data.tags.indexOf('featured') == -1);
    return featuredCollection.concat(others);
  });

  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toLocal().toFormat('LLL dd, yyyy');
  });

  eleventyConfig.addFilter('htmlShortDate', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toLocal().toFormat('LLL dd, yyyy');
  });

  eleventyConfig.addFilter('googleDate', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toLocal().toFormat('yyyy-MM-dd');
  });

  eleventyConfig.addFilter('linkName', (linkString) => {
    return linkString.split("|").map(x => x.trim()).shift();
  });

  eleventyConfig.addFilter('linkUrl', (linkString) => {
    return linkString.split("|").map(x => x.trim()).reverse().shift();
  });

  eleventyConfig.addNunjucksAsyncShortcode('rI', async function(src, alt, width, classes, url="", target="_self") {
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on rImage from: ${src}`);
    }
    let sortedWidths = width;
    let stats = await Image(src, {
      widths: sortedWidths,
      formats: ["jpeg"],
      urlPath: "/images/",
      outputDir: "_site/images/",
    });

    let sets = stats["jpeg"];
    let sources = sortedWidths.map(w => "(max-width: " + w + "px)").map((s, i) => {
      return `<source srcset="${sets[i].url}" media="${s}">`
    }).join("\n");
    sources += `<source srcset=${sets[sets.length - 1].url} media="(min-width: ${sortedWidths[sortedWidths.length - 1]}px)">\n`;  
    let code = `
    <a href="${url}" class="img-ref" target="${target}" rel="noopener" >
    <picture class="${classes}">
      ${sources}
      <img alt="${alt}" src="${stats["jpeg"][0].url}"  />
    </picture>
    </a>
    `;
    return code;
  });

  
  eleventyConfig.addCollection("tagList", function(collection) {
    let tagSet = new Set();
    collection.getAll().forEach(function(item) {
      if( "tags" in item.data ) {
        let tags = item.data.tags;

        tags = tags.filter(function(item) {
          switch(item) {
            // this list should match the `filter` list in tags.njk
            case "all":
            case "nav":
            case "post":
            case "devblogs":
            case "playbooks":
              return false;
          }

          return true;
        });

        for (const tag of tags) {
          tagSet.add(tag);
        }
      }
    });

    // returning an array in addCollection works in Eleventy 0.5.3
    return [...tagSet];
  });
  eleventyConfig.addPlugin(pluginSyntaxHighlight);

  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy(".htaccess");

  eleventyConfig.addFilter("head", (array, n) => {
    if( n < 0 ) {
      return array.slice(n);
    }
    return array.slice(0, n);
  });
  /* Markdown Overrides */
  let markdownLibrary = markdownIt({
    html: true,
    breaks: true,
    linkify: true
  }).use(markdownItAnchor, {
    permalink: true,
    permalinkClass: "direct-link",
    permalinkSymbol: "#"
  })
    .use(customBlock, {
      quote (arg) {
        return `<blockquote class="heavy-quote">${arg}</blockquote>`
      }
    })
  eleventyConfig.setLibrary("md", markdownLibrary);
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function(err, bs) {

        bs.addMiddleware("*", (req, res) => {
          const content_404 = fs.readFileSync('_site/404.html');
          // Provides the 404 content without redirect.
          res.write(content_404);
          // Add 404 http status code in request header.
          // res.writeHead(404, { "Content-Type": "text/html" });
          res.writeHead(404);
          res.end();
        });
      }
    }
  })

  return {
    templateFormats: [
      "md",
      "njk",
      "html",
      "liquid"
    ],

    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",

    // These are all optional, defaults are shown:
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
      autoescape: false
    }
  };
};
