module.exports = function (content, url, target) {
    target = target || "_blank";
    return `
        <li><a target="${target}" href="${url}">${content}</a></li>
    `
}