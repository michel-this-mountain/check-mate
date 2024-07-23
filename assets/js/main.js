let loaderElementIds = ["enum-tooling-spider-start-button", "enum-tooling-extract-headers"]
let totalScriptsProcessing = 0;

document.addEventListener('DOMContentLoaded', () => {
    // IDs of buttons to set event listeners on
    let browserRuntimeActionIds = [
        "enum-tooling-spider-start-button",

        "enum-tooling-highlight-forms-cp",
        "enum-tooling-highlight-inputs-cp",
        "enum-tooling-extract-comments-cp",
        "enum-tooling-extract-forms-cp",
        "enum-tooling-extract-url-cp",
        "enum-tooling-extract-headers",

        "enum-tooling-iframe-get-current-url"
    ];

    // Set event listeners for all enum-tools on the toolbox page
    browserRuntimeActionIds.forEach(id => {
        let tmpElement = document.getElementById(id);
        if (tmpElement) {
            tmpElement.addEventListener('click', () => {
                let messageValue = tmpElement.value
                browser.runtime.sendMessage({command: messageValue, id: id});

                // these are scripts that take longer to process, e.g. spidering a website, if so, the loading icon appears on the left bottom side
                loaderCheck(id, true)
            });
        }
    });

    // Listen for messages from the background script
    browser.runtime.onMessage.addListener(async (message) => {

        loaderCheck(message.id, false);

        if (message.hasOwnProperty("enumSpider")) {
            if (isValidJSON(message.enumSpider)) {
                let simplified = JSON.stringify(JSON.parse(message.enumSpider).simpleTree)
                let detailed = JSON.stringify(JSON.parse(message.enumSpider).siteTree)

                document.getElementById("enum-tooling-spider-simplified-view").value = formatJSON(simplified)
                document.getElementById("enum-tooling-spider-detailed-view").value = formatJSON(detailed)
                document.getElementById("enum-tooling-spider-output-textarea").value = formatJSON(simplified)
            }
        }

        // enum-tooling (toolbox)
        if (message.hasOwnProperty("toolboxJson")) {
            if (isValidJSON(message.toolboxJson)) {
                document.getElementById("enum-tooling-output-textarea").value = formatJSON(message.toolboxJson);
            }
        }

        // enum-tooling (iframe checker)
        if (message.hasOwnProperty("enumToolingGetCurrentUrlIframe")) {
            // Relay the message back to the popup script
            document.getElementById("enum-tooling-iframe-url-input").value = message.enumToolingGetCurrentUrlIframe
        }

    });
});

/**
 * loaderCheck()
 *
 * checks if the loader element should be shown or should be hidden, based on the total scripts that are being processed.
 *
 * @param currentId
 * @param incrementTotalScriptsProcessing
 */
function loaderCheck(currentId, incrementTotalScriptsProcessing) {
    // loader element and see if there is a match
    let loaderElement = document.getElementById("loader")
    let match = loaderElementIds.includes(currentId)

    // decrement the total scripts processing | loader icon will hide if it reaches 0
    if (incrementTotalScriptsProcessing === false && match) {
        if (totalScriptsProcessing > 0) {
            totalScriptsProcessing -= 1;
            if (totalScriptsProcessing === 0) {
                loaderElement.classList.add("d-none")
            }
        }

    // increment the total scripts processing | loader icon will show if totalScriptsProcessing is >  0
    } else if (incrementTotalScriptsProcessing === true && match) {
        if (totalScriptsProcessing >= 0) {
            totalScriptsProcessing += 1
            loaderElement.classList.remove("d-none")
        }
    }

}
