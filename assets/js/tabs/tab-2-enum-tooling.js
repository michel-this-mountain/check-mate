document.addEventListener("DOMContentLoaded", function () {
    // #### IFRAME CHECKER tab START #### //
    let checkIframeButton = document.getElementById("enum-tooling-iframe-check-iframe-button")
    let iframeInputUrl = document.getElementById("enum-tooling-iframe-url-input")
    let iframeElement  = document.getElementById("enum-tooling-iframe-check-iframe-element")

    checkIframeButton.addEventListener("click", function () {
        iframeElement.src = iframeInputUrl.value;
    })
    // #### IFRAME CHECKER tab END #### //

})