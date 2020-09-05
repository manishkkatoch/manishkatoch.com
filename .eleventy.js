const { DateTime } = require("luxon");
const fs = require("fs");
const CleanCSS = require("clean-css");
const Image = require("@11ty/eleventy-img");
const pluginSEO = require("eleventy-plugin-seo");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const pluginNavigation = require("@11ty/eleventy-navigation");
const customBlock = require('markdown-it-custom-block')

module.exports = function(eleventyConfig) {
  // eleventyConfig.addPlugin(pluginRss);
  // eleventyConfig.addPlugin(pluginSyntaxHighlight);
  // eleventyConfig.addPlugin(pluginNavigation);

  eleventyConfig.setDataDeepMerge(true);

  eleventyConfig.addLayoutAlias("post", "layouts/post.njk");
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginSEO, {
    title: "Manish Katoch",
    description: "Blog of Manish Katoch.",
    url: "https://manishkatoch.com",
    author: "Manish Katoch",
    twitter: "m_the_katoch",
    image: "./images/about_me.jpeg"
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

  eleventyConfig.addFilter('linkName', (linkString) => {
    return linkString.split("|").map(x => x.trim()).shift();
  });

  eleventyConfig.addFilter('linkUrl', (linkString) => {
    return linkString.split("|").map(x => x.trim()).reverse().shift();
  });

  eleventyConfig.addNunjucksAsyncShortcode('rI', async function(src, alt, width, classes, url="", target="_blank") {
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on rImage from: ${src}`);
    }
    
    let stats = await Image(src, {
      widths: width,
      formats: ["jpeg"],
      urlPath: "/img/",
      outputDir: "./img/",
    });

    let sets = stats["jpeg"].map(i => i.srcset).join(",");
    sizes = width.map(w => "(max-width: " + (w + 10) + "px) " + w + "w").join(",");
    let code = `
    <a href="${url}" target="${target}" rel="noopener" >
      <img alt="${alt}" src="${stats["jpeg"][0].url}" class="${classes}" srcset="${sets}"/>
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

  return {
    templateFormats: [
      "md",
      "njk",
      "html",
      "liquid"
    ],

    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",

    // These are all optional, defaults are shown:
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
