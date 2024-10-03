let cookieChangesJson = {};
let currentTabOpened = null;
let currentDomainOpened = null

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Query the active tab and send a command to the content script
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    if (tabs.length > 0) {
        if (message.command === "background-ping") {
            currentTabOpened = new URL(tabs[0].url);
            currentDomainOpened = currentTabOpened.hostname
        } else if (message.command === "background-reset-cookies") {
            cookieChangesJson = {};
        } else {
            let activeTabId = tabs[0].id;
            if (message.hasOwnProperty("value")){
                browser.tabs.sendMessage(activeTabId, {command: message.command, id: message.id, value: message.value, targetSelectValue: message.targetSelectValue});

            } else {
                browser.tabs.sendMessage(activeTabId, {command: message.command, id: message.id});
            }
        }
    }
});

/**
 * init the cookieMonitor()
 *
 * monitors the initial cookies, and all changes applied to it.
 */
(function initCookieMonitor() {
    // Listen for cookie changes
    browser.cookies.onChanged.addListener(async (changeInfo) => {
        const {cookie, removed, cause} = changeInfo;
        const tabs = await browser.tabs.query({active: true, currentWindow: true});
        if (tabs.length > 0) {
            currentTab = new URL(tabs[0].url);
            currentDomain = currentTab.hostname;

            const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '');

            const cookieChange = {
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                samesite: cookie.sameSite,
                cause: cause,
                removed: removed,
                timestamp: timestamp
            };

            // Initialize the domain array if it doesn't exist
            if (!cookieChangesJson.hasOwnProperty(currentDomain)) {
                cookieChangesJson[currentDomain] = [];
            }

            // Add the new change to the beginning of the array
            cookieChangesJson[currentDomain].unshift(cookieChange);

            // Limit the array size to 200 entries
            while (cookieChangesJson[currentDomain].length > 1000) {
                cookieChangesJson[currentDomain].pop();
            }
        }
    });
})();

(function sendBackgroundMessage() {
    try {
        if (cookieChangesJson !== null && cookieChangesJson.hasOwnProperty(currentDomainOpened) && cookieChangesJson !== undefined) {
            if (cookieChangesJson[currentDomainOpened].length > 0) {
                let msg = {
                    cookieChange: {
                        [currentDomainOpened]: cookieChangesJson[currentDomainOpened]
                    },
                    id: "enum-tooling-altered-cookie-messages"
                };

                browser.runtime.sendMessage(msg)
                    .catch(error => {
                        // Handle any errors that occurred, if any error is triggered, it is most likely due to the plugin being closed
                        // console.log("Error sending message (Plugin is closed):", error);
                    });
            }
        }
    } catch (e) {
        console.log(e);
    } finally {
        setTimeout(sendBackgroundMessage, 5000)
    }
})();

