document.addEventListener("DOMContentLoaded", function () {
    // #### SPIDER tab START #### //
    let enumToolingSpiderSimplifiedButton = document.getElementById("enum-tooling-spider-simplified-view")
    let enumToolingSpiderDetailedButton = document.getElementById("enum-tooling-spider-detailed-view")
    let enumToolingSpiderOutputArea = document.getElementById("enum-tooling-spider-output-textarea")

    enumToolingSpiderSimplifiedButton.addEventListener("click", function () {
        enumToolingSpiderOutputArea.value = enumToolingSpiderSimplifiedButton.value
    })

    enumToolingSpiderDetailedButton.addEventListener("click", function () {
        enumToolingSpiderOutputArea.value = enumToolingSpiderDetailedButton.value
    })

    // #### SPIDER tab END #### //
    // #### IFRAME CHECKER tab START #### //
    let checkIframeButton = document.getElementById("enum-tooling-iframe-check-iframe-button")
    let iframeInputUrl = document.getElementById("enum-tooling-iframe-url-input")
    let iframeElement  = document.getElementById("enum-tooling-iframe-check-iframe-element")

    checkIframeButton.addEventListener("click", function () {
        iframeElement.src = iframeInputUrl.value;
    })
    // #### IFRAME CHECKER tab END #### //

})