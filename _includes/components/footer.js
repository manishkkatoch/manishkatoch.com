module.exports = function (contact, data) {
  return `
    <section class="container-fluid dark-bg align-items-center mk-footer">
        <div class="row d-flex align-items-center p-0 mx-auto">
            <div class="col-lg-3 padded-col">
                <img class="hero d-block mx-auto" src="${data.heroUrl}" />
            </div>
            <div class="col-lg-6 padded-col">
                <section class="bio">
                    ${data.bio}
                </section>
            </div>
            <div class="col-lg-1 padded-col"></div>
            <div class="col-lg-2 padded-col">
                ${contact}
            </div>
        </div>
        <div class="row d-flex align-items-center p-40 mx-auto copy">
            <p>&copy; Manish Katoch 2020</p>
        </div>
    </section>
  `;
};
