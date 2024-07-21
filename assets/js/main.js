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
                browser.runtime.sendMessage({command: messageValue});
            });
        }
    });

    // Listen for messages from the background script
    browser.runtime.onMessage.addListener(async (message) => {
        if (message.hasOwnProperty("enumSpider")) {
            console.log("---")
            console.log(message.enumSpider)
            console.log("---")

            document.getElementById("enum-tooling-spider-simplified-view").value = formatJSON(message.enumSpider.simplified)
            document.getElementById("enum-tooling-spider-detailed-view").value = formatJSON(message.enumSpider.detailed)
            document.getElementById("enum-tooling-spider-output-textarea").value = formatJSON(message.enumSpider.simplified)

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


