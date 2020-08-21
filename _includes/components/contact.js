module.exports = function (contactLinks, location) {
    return `
        <span>I'm reachable!</span><br/><br/>
        <ul class="list-unstyled p-10">
            ${contactLinks}
        </ul>
        <br/>
        <span>currently in:<span><br/>
        <span>${location}</span>
    `
}