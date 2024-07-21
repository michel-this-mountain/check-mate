// mediator between popup.js and background.js

// Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Query the active tab and send a command to the content script
    browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        let activeTabId = tabs[0].id;
        browser.tabs.sendMessage(activeTabId, {command: message.command});
    });


    if (message.hasOwnProperty("enumSpider")) {
        // relay the spider results back
        browser.runtime.sendMessage({enumSpider: message.enumSpider})
    }

    if (message.hasOwnProperty("toolboxJson")) {
        // Relay the message back to the popup script
        browser.runtime.sendMessage({toolboxJson: message.toolboxJson});
    }

    if (message.hasOwnProperty("enumToolingGetCurrentUrlIframe")) {
        // Relay the message back to the popup script
        browser.runtime.sendMessage({enumToolingGetCurrentUrlIframe: message.enumToolingGetCurrentUrlIframe});
    }


});
