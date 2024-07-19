document.addEventListener('DOMContentLoaded', () => {
    // IDs of buttons to set event listeners on
    let browserRuntimeActionIds = [
        "enum-tooling-highlight-forms-cp",
        "enum-tooling-highlight-inputs-cp",
        "enum-tooling-extract-comments-cp",
        "enum-tooling-extract-forms-cp",
        "enum-tooling-extract-url-cp",
        "enum-tooling-extract-headers",
    ];

    // Set event listeners for all enum-tools on the toolbox page
    browserRuntimeActionIds.forEach(id => {
        let tmpElement = document.getElementById(id);
        if (tmpElement) {
            tmpElement.addEventListener('click', () => {
                let messageValue = tmpElement.value
                browser.runtime.sendMessage({ command: messageValue });
            });
        }
    });

    // Listen for messages from the background script
    browser.runtime.onMessage.addListener(async (message) => {
        if (message.hasOwnProperty("toolboxJson")) {
            if (isValidJSON(message.toolboxJson)) {
                document.getElementById("enum-tooling-output-textarea").value = formatJSON(message.toolboxJson);
            }
        }
    });
});


