const { DateTime } = require("luxon");
const fs = require("fs");
// const pluginRss = require("@11ty/eleventy-plugin-rss");
// const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
// const pluginNavigation = require("@11ty/eleventy-navigation");
// const markdownIt = require("markdown-it");
// const markdownItAnchor = require("markdown-it-anchor");
const footerShortcode = require("./_includes/components/footer");
const fontText = require("./_includes/components/font-text");
const externalLink = require("./_includes/components/external-link");
const contact = require("./_includes/components/contact");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const pluginNavigation = require("@11ty/eleventy-navigation");

module.exports = function(eleventyConfig) {
  // eleventyConfig.addPlugin(pluginRss);
  // eleventyConfig.addPlugin(pluginSyntaxHighlight);
  // eleventyConfig.addPlugin(pluginNavigation);

  // eleventyConfig.setDataDeepMerge(true);

  eleventyConfig.addLayoutAlias("post", "layouts/post.njk");
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
  });

  // // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toLocal().toFormat('LLL dd, yyyy');
  });

  eleventyConfig.addFilter('htmlShortDate', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toLocal().toFormat('LLL dd');
  });

  eleventyConfig.addFilter('linkName', (linkString) => {
    return linkString.split("|").map(x => x.trim()).shift();
  });

  eleventyConfig.addFilter('linkUrl', (linkString) => {
    return linkString.split("|").map(x => x.trim()).reverse().shift();
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
            case "posts":
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
  eleventyConfig.addPassthroughCopy("css");

  eleventyConfig.addPairedShortcode("footer", footerShortcode);
  eleventyConfig.addShortcode("fontText", fontText);
  eleventyConfig.addJavaScriptFunction("fontText", fontText);
  eleventyConfig.addPairedShortcode("extLinkLi", externalLink);
  eleventyConfig.addPairedShortcode("contact", contact);

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
    .use(require('@gerhobbelt/markdown-it-container'))
    ;
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
