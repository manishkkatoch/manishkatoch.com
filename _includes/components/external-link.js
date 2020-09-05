module.exports = function (content, url, target) {
    target = target || "_blank";
    return `
        <li><a target="${target}" rel="noopener" href="${url}">${content}</a></li>
    `
}