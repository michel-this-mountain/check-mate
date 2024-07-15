document.addEventListener('DOMContentLoaded', () => {

    // if the sendMessageButton is clicked, send a message to the background script
    document.getElementById('sendMessageButton').addEventListener('click', () => {
        browser.runtime.sendMessage("getDomainName").then(response => {
            console.log(response.response);
        });
    });

    // Listen for messages from the background script
    browser.runtime.onMessage.addListener(async (message) => {
        if (message.domainName) {
            document.getElementById('domainName').innerText = `Domain: ${message.domainName}`;
        }
    });
});

