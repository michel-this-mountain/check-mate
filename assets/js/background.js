// mediator between popup.js and background.js

// Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message === "getDomainName") {

    // Query the active tab and send a command to the content script
    browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
      let activeTabId = tabs[0].id;
      browser.tabs.sendMessage(activeTabId, {command: "getDomainName"});
    });
    sendResponse({response: "Message sent to content script"});

  } else if (message.domainName) {
    // Relay the message back to the popup script
    browser.runtime.sendMessage({domainName: message.domainName});
  }
});
