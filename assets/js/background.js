browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Query the active tab and send a command to the content script
    browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        let activeTabId = tabs[0].id;
        browser.tabs.sendMessage(activeTabId, {command: message.command, id: message.id});
    });
});