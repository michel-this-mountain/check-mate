let cookieChangesJson = null;
let postMessageEventsJson = null;

(function cookieMonitor() {
    // Array to store cookie changes
    const cookieChanges = [];
    let originalCookies = new Map(document.cookie.split('; ').map(cookie => {
        const [name, val = ''] = cookie.split('=');
        return [name.trim(), val.trim()];
    }));

    // Function to poll cookies and detect changes
    function pollCookies() {
        const currentCookies = new Map(document.cookie.split('; ').map(cookie => {
            const [name, val = ''] = cookie.split('=');
            return [name.trim(), val.trim()];
        }));

        // Check for added or updated cookies
        currentCookies.forEach((value, name) => {
            if (!originalCookies.has(name)) {
                const change = {
                    action: 'set',
                    cookie: `${name}=${value}`,
                    path: location.pathname,
                    timestamp: new Date().toISOString()
                };
                cookieChanges.push(change);
            } else if (originalCookies.get(name) !== value) {
                const change = {
                    action: 'update',
                    cookie: `${name}=${value}`,
                    path: location.pathname,
                    timestamp: new Date().toISOString()
                };
                cookieChanges.push(change);
            }
        });

        // Check for deleted cookies
        originalCookies.forEach((value, name) => {
            if (!currentCookies.has(name)) {
                const change = {
                    action: 'delete',
                    cookie: name,
                    path: location.pathname,
                    timestamp: new Date().toISOString()
                };
                cookieChanges.push(change);
            }
        });

        // Update the original cookies to the current state
        originalCookies = currentCookies;

        // Continue polling
        setTimeout(pollCookies, 1000);
    }

    // Expose function to get all cookie changes as a JSON string
    window.getCookieChanges = function () {
        return JSON.stringify(cookieChanges, getCircularReplacer(), 2);
    };

    // Automatically start polling on page load
    window.addEventListener('load', function () {
        console.log('[*][CM] Cookie monitor initialized');
        pollCookies();
    });
})();

// Intercept and log all window.postMessage events
(function interceptPostMessages() {
    const originalPostMessage = window.postMessage;
    console.log('[*][CM] Postmessage monitor initialized');
    // Array to store postMessage events
    const postMessageEvents = [];

    window.postMessage = function (message, targetOrigin, transfer) {
        const sanitizedMessage = sanitizeMessage(message);
        const eventDetails = {
            message: sanitizedMessage,
            targetOrigin: targetOrigin,
            transfer: transfer,
            path: location.pathname,
            timestamp: new Date().toISOString()
        };
        postMessageEvents.push(eventDetails);

        // Call the original postMessage function
        return originalPostMessage.apply(this, arguments);
    };

    // Intercept received messages
    window.addEventListener("message", function (event) {
        const sanitizedMessage = sanitizeMessage(event.data);
        const eventDetails = {
            message: sanitizedMessage,
            timestamp: new Date().toISOString()
        };
        postMessageEvents.push(eventDetails);
    });

    // Expose function to get all postMessage events as a JSON string
    window.getPostMessageEvents = function () {
        return JSON.stringify(postMessageEvents, getCircularReplacer(), 2);
    };
})();

// Function to handle circular references in objects
function getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
}

// Function to sanitize messages by removing any properties that might cause cross-origin issues
function sanitizeMessage(message) {
    if (typeof message !== "object" || message === null) {
        return {message};
    }
    const sanitized = {message: {}};
    for (const key in message) {
        if (message.hasOwnProperty(key)) {
            try {
                sanitized.message[key] = message[key];
            } catch (e) {
                console.warn(`Unable to access property ${key}:`, e);
            }
        }
    }
    return sanitized;
}

// Function to log all changes
function logAllChanges() {
    try {
        cookieChangesJson = JSON.parse(window.getCookieChanges());
        postMessageEventsJson = JSON.parse(window.getPostMessageEvents());

        if (postMessageEventsJson.length > 0) {
            // console.log('[*][CM] Detected Postmessage changes:', postMessageEventsJson);

            let msg = {
                domainName: document.domain,
                postMessage: {
                    [`${document.domain}`]: postMessageEventsJson
                },
                id: "enum-tooling-intercepted-post-messages"
            }
            browser.runtime.sendMessage(msg);
        }

        if (cookieChangesJson.length > 0) {
            // console.log('[*][CM] Detected cookie changes:', cookieChangesJson);
            let msg = {
                domainName: document.domain,
                cookieChange: {
                    [`${document.domain}`]: cookieChangesJson
                },
                id: "enum-tooling-altered-cookie-messages"
            }

            browser.runtime.sendMessage(msg);
        }
    } catch (error) {
        console.error('Error logging changes:', error);
    }

    setTimeout(logAllChanges, 3000);
}

// Start logging changes every 3 seconds
logAllChanges();
