document.addEventListener("DOMContentLoaded", function () {
    // SPIDER tab
    const spiderSimplifiedButton = document.getElementById("enum-tooling-spider-simplified-view");
    const spiderDetailedButton = document.getElementById("enum-tooling-spider-detailed-view");
    const spiderOutputArea = document.getElementById("enum-tooling-spider-output-textarea");

    spiderSimplifiedButton.addEventListener("click", () => {
        spiderOutputArea.value = spiderSimplifiedButton.value;
    });

    spiderDetailedButton.addEventListener("click", () => {
        spiderOutputArea.value = spiderDetailedButton.value;
    });

    // IFRAME CHECKER tab
    const checkIframeButton = document.getElementById("enum-tooling-iframe-check-iframe-button");
    const iframeInputUrl = document.getElementById("enum-tooling-iframe-url-input");
    const iframeElement = document.getElementById("enum-tooling-iframe-check-iframe-element");

    checkIframeButton.addEventListener("click", () => {
        iframeElement.src = iframeInputUrl.value;
    });
});