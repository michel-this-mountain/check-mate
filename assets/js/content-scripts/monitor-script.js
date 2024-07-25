(function cookieMonitor() {
    // Array to store cookie changes
    const cookieChanges = [];
    let originalCookies = document.cookie;

    // Function to simulate async operation (for example, logging or storing changes)
    function logChange(change) {
        return new Promise(resolve => {
            setTimeout(() => {
                console.log("Logging change:", change);
                resolve();
            }, 100); // Simulate some delay
        });
    }

    // Function to poll cookies and detect changes
    function pollCookies() {
        const currentCookies = document.cookie;
        const currentCookiesArray = currentCookies.split('; ').map(cookie => cookie.trim());
        const originalCookiesArray = originalCookies.split('; ').map(cookie => cookie.trim());

        // Check for added or updated cookies
        currentCookiesArray.forEach(cookie => {
            if (!originalCookiesArray.includes(cookie)) {
                const [name, val] = cookie.split('=');
                const change = {
                    action: 'set',
                    cookie: `${name.trim()}=${val.trim()}`,
                    path: location.pathname,
                    timestamp: new Date().toISOString()
                };
                cookieChanges.push(change);
            }
        });

        // Check for deleted cookies
        originalCookiesArray.forEach(cookie => {
            if (!currentCookiesArray.includes(cookie)) {
                const [name] = cookie.split('=');
                const change = {
                    action: 'delete',
                    cookie: name.trim(),
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

    // Expose function to get all cookie changes as a JSON object
    window.getCookieChanges = function () {
        return JSON.stringify(cookieChanges, null, 2);
    };

    // Automatically start polling on page load
    window.addEventListener('load', function () {
        console.log('Cookie monitoring initialized');
        pollCookies();
    });
})();

// Intercept and log all window.postMessage events
(function interceptPostMessages() {
    const originalPostMessage = window.postMessage;

    // Array to store postMessage events
    const postMessageEvents = [];

    window.postMessage = function (message, targetOrigin, transfer) {
        const eventDetails = {
            message: message,
            targetOrigin: targetOrigin,
            transfer: transfer,
            path: location.pathname,
            timestamp: new Date().toISOString()
        };
        postMessageEvents.push(eventDetails);
        // console.log("Intercepted postMessage:", eventDetails);

        // Call the original postMessage function
        return originalPostMessage.apply(this, arguments);
    };

    // Intercept received messages
    window.addEventListener("message", function (event) {
        const eventDetails = {
            message: event.data,
            origin: event.origin,
            source: null, // Remove to avoid circular references
            path: location.pathname,
            timestamp: new Date().toISOString()
        };
        postMessageEvents.push(eventDetails);
        // console.log("Received postMessage:", eventDetails);
    });

    // Expose function to get all postMessage events as a JSON object
    window.getPostMessageEvents = function () {
        return JSON.stringify(postMessageEvents, null, 2);
    };
})();

// Intercept and log all WebSocket communication
(function interceptWebSockets() {
    const originalWebSocket = window.WebSocket;

    // Array to store WebSocket events
    const webSocketEvents = [];

    function logWebSocketEvent(event) {
        webSocketEvents.push(event);
        console.log("WebSocket event:", event);
    }

    window.WebSocket = function (url, protocols) {
        const ws = new originalWebSocket(url, protocols);

        ws.addEventListener('open', event => {
            logWebSocketEvent({
                type: 'open',
                url: url,
                protocols: protocols,
                path: location.pathname,
                timestamp: new Date().toISOString()
            });
        });

        ws.addEventListener('message', event => {
            logWebSocketEvent({
                type: 'message',
                data: event.data,
                path: location.pathname,
                timestamp: new Date().toISOString()
            });
        });

        ws.addEventListener('close', event => {
            logWebSocketEvent({
                type: 'close',
                reason: event.reason,
                code: event.code,
                path: location.pathname,
                timestamp: new Date().toISOString()
            });
        });

        ws.addEventListener('error', event => {
            logWebSocketEvent({
                type: 'error',
                path: location.pathname,
                timestamp: new Date().toISOString()
            });
        });

        return ws;
    };

    // Expose function to get all WebSocket events as a JSON object
    window.getWebSocketEvents = function () {
        return JSON.stringify(webSocketEvents, null, 2);
    };
})();

// Intercept and log Service Worker communication
(function interceptServiceWorkers() {
    const originalFetch = window.fetch;

    // Array to store Service Worker events
    const serviceWorkerEvents = [];

    function logServiceWorkerEvent(event) {
        serviceWorkerEvents.push(event);
        console.log("Service Worker event:", event);
    }

    window.fetch = function (...args) {
        const [resource, config] = args;
        const eventDetails = {
            type: 'fetch',
            resource: resource,
            config: config,
            path: location.pathname,
            timestamp: new Date().toISOString()
        };
        logServiceWorkerEvent(eventDetails);

        return originalFetch.apply(this, args);
    };

    // Expose function to get all Service Worker events as a JSON object
    window.getServiceWorkerEvents = function () {
        return JSON.stringify(serviceWorkerEvents, null, 2);
    };
})();

// Intercept and log HTTP requests
(function interceptHttpRequests() {
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    // Array to store HTTP request events
    const httpRequestEvents = [];

    function logHttpRequestEvent(event) {
        httpRequestEvents.push(event);
        console.log("HTTP Request event:", event);
    }

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._url = url;
        this._method = method;
        return originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener('load', () => {
            logHttpRequestEvent({
                method: this._method,
                url: this._url,
                status: this.status,
                response: this.responseText,
                path: location.pathname,
                timestamp: new Date().toISOString()
            });
        });
        return originalXhrSend.apply(this, arguments);
    };

    // Expose function to get all HTTP request events as a JSON object
    window.getHttpRequestEvents = function () {
        return JSON.stringify(httpRequestEvents, null, 2);
    };
})();

// Custom replacer function to handle circular references
function removeCircularReferences(key, value) {
    if (typeof value === "object" && value !== null) {
        if (this.seen.has(value)) {
            return;
        }
        this.seen.add(value);
    }
    return value;
}

// Function to log all changes
function logAllChanges() {
    const seen = new WeakSet(); // To track seen objects
    const cookieChangesJson = window.getCookieChanges();
    // const postMessageEventsJson = JSON.stringify(JSON.parse(window.getPostMessageEvents()), removeCircularReferences.bind({ seen }), 2);
    const webSocketEventsJson = window.getWebSocketEvents();
    const serviceWorkerEventsJson = window.getServiceWorkerEvents();
    const httpRequestEventsJson = window.getHttpRequestEvents();
    console.log('Logging all changes:');
    console.log('Cookie Changes:', cookieChangesJson);
    // console.log('PostMessage Events:', postMessageEventsJson);
    console.log('WebSocket Events:', webSocketEventsJson);
    console.log('Service Worker Events:', serviceWorkerEventsJson);
    console.log('HTTP Request Events:', httpRequestEventsJson);
    setTimeout(logAllChanges, 5000);
}

// Start logging changes every 5 seconds
logAllChanges();
