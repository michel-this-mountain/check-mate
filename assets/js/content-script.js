// script that gets injected in the specified urls (manifest.json)
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    switch (message.command) {
        // tab 1 recon-tooling (spider)
        case "spiderCurrentWebsite":
            let spiderResult = await initSpider()
            browser.runtime.sendMessage({enumSpider: spiderResult, id:message.id})
            break;

        // tab 2 recon-tooling (toolbox)
        case "highlightForms":
            document.querySelectorAll('form').forEach(form => form.style.border = '5px solid red');
            break;
        case "highlightInputs":
            document.querySelectorAll('input').forEach(input => input.style.border = '5px solid red');
            break;
        case "extractCommentsCP":
            let comments = extractCommentsAsJson();
            browser.runtime.sendMessage({toolboxJson: comments, id:message.id});
            break;
        case "extractFormsCP":
            let forms = extractFormsAsJson();
            browser.runtime.sendMessage({toolboxJson: forms, id:message.id});
            break;
        case "extractUrlsCP":
            let urls = extractUrlsAsJson();
            browser.runtime.sendMessage({toolboxJson: urls, id:message.id});
            break;
        case "extractHeaderCP":
            let headers = await extractHeadersAsJson();
            browser.runtime.sendMessage({toolboxJson: headers, id:message.id});
            break;

        // tab 2 recon-tooling (iframe checker)
        case "enumToolingGetCurrentUrlIframe":
            let currentUrlPath = location.href
            browser.runtime.sendMessage({enumToolingGetCurrentUrlIframe: currentUrlPath, id:message.id});
            break;
        // Additional cases for other commands can be added here
    }
});


async function spiderWebsite(startUrl, maxDepth = 2) {
    const visited = new Set();
    const siteTree = {};

    function addUrlToTree(tree, url, formInfo) {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        let currentLevel = tree;

        pathSegments.forEach((segment, index) => {
            const fullPath = urlObj.origin + '/' + pathSegments.slice(0, index + 1).join('/');
            if (!currentLevel[fullPath]) {
                currentLevel[fullPath] = { totalForms: 0, forms: [] };
            }
            if (index === pathSegments.length - 1) {
                currentLevel[fullPath].totalForms = formInfo.totalForms;
                currentLevel[fullPath].forms = formInfo.forms;
            }
            currentLevel = currentLevel[fullPath];
        });
    }

    async function visitPage(currentUrl, depth) {
        if (depth > maxDepth || visited.has(currentUrl)) {
            return;
        }

        visited.add(currentUrl);

        try {
            const response = await fetch(currentUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${currentUrl}: ${response.statusText}`);
            }
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            const links = Array.from(doc.querySelectorAll('a[href]'))
                .map(link => link.getAttribute('href'))
                .map(href => new URL(href, currentUrl).href);

            const filteredLinks = links.filter(link => {
                const normalizedLink = new URL(link).href;
                return normalizedLink.startsWith(startUrl) && !visited.has(normalizedLink);
            });

            const uniqueFilteredLinks = [...new Set(filteredLinks)];

            const forms = doc.querySelectorAll('form');
            const formTags = Array.from(forms).map(form => form.outerHTML.match(/<form[^>]*>/)[0]);
            const formInfo = { totalForms: forms.length, forms: formTags };

            addUrlToTree(siteTree, currentUrl, formInfo);

            for (const link of uniqueFilteredLinks) {
                await visitPage(link, depth + 1);
            }
        } catch (error) {
            console.error(`Error visiting ${currentUrl}: ${error.message}`);
        }
    }

    await visitPage(startUrl, 0);

    const simpleTree = buildSimpleTree(siteTree, startUrl);

    return { simpleTree, siteTree };
}

function buildSimpleTree(tree, rootUrl) {
    const simpleTree = {};
    const rootDomain = new URL(rootUrl).origin;

    function traverse(node, currentPath) {
        for (const key in node) {
            if (typeof node[key] === 'object' && !Array.isArray(node[key])) {
                const newPath = key;
                const domainRoot = currentPath === '' ? rootDomain : currentPath;
                simpleTree[domainRoot] = simpleTree[domainRoot] || [];
                simpleTree[domainRoot].push(newPath);
                traverse(node[key], newPath);
            }
        }
    }

    traverse(tree, '');

    return simpleTree;
}

async function initSpider() {
    const startUrl = window.location.origin; // Use the domain as the starturl
    const { simpleTree, siteTree } = await spiderWebsite(startUrl, 2);

    // Convert the tree structure to a JSON string
    return JSON.stringify({ simpleTree, siteTree }, null, 2); // Logs the JSON string of the site tree structure
}


// treeStructureJson will now hold the JSON string after initSpider resolves

/**
 * extractCommentsFromCurrentPage()
 *
 * Extract all the comments, multiline or singleline, in javascript or html from the current page
 *
 * @returns {string}
 */
function extractCommentsAsJson() {
    // Get the HTML content of the current page
    const htmlString = document.documentElement.outerHTML;
    const urlPath = window.location.href;

    // Regular expressions to match HTML and JavaScript comments
    const htmlCommentRegex = /<!--[\s\S]*?-->/g;
    const jsCommentRegex = /\/\*[\s\S]*?\*\/|\/\/[^\n]*$/gm;

    // Extract comments
    const htmlComments = [...htmlString.matchAll(htmlCommentRegex)];
    const scriptTagContent = htmlString.match(/<script[\s\S]*?>[\s\S]*?<\/script>/gi) || [];

    let comments = [];

    // Extract JS comments from script tags
    scriptTagContent.forEach(scriptTag => {
        comments = comments.concat([...scriptTag.matchAll(jsCommentRegex)]);
    });

    // Combine HTML and JS comments
    const allComments = htmlComments.concat(comments);

    if (allComments.length === 0) {
        return `no comments can be found for ${urlPath}`;
    }

    // Function to get the line number of a comment
    function getLineNumber(comment) {
        const beforeComment = htmlString.substring(0, comment.index);
        return beforeComment.split('\n').length;
    }

    // Map comments to objects with line number and content
    const commentsWithLineNumbers = allComments.map(comment => {
        const lineNumber = getLineNumber(comment);
        return {lineNumber, comment: comment[0].trim()};
    });

    // Sort comments by line number
    commentsWithLineNumbers.sort((a, b) => a.lineNumber - b.lineNumber);

    // Format comments as a JSON object
    const formattedComments = commentsWithLineNumbers.reduce((acc, curr) => {
        acc[curr.lineNumber] = curr.comment;
        return acc;
    }, {});

    return JSON.stringify(formattedComments, null, 2);
}


function extractFormsAsJson() {
    const forms = document.querySelectorAll('form');
    const formDetails = {};

    forms.forEach(form => {
        let formHtml = form.outerHTML;

        // Remove invisible characters and trim spaces
        formHtml = formHtml.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

        // Find the line number of the form
        const htmlSource = document.documentElement.outerHTML;
        const lines = htmlSource.split('\n');
        let formStartIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(formHtml.substring(0, 30))) {
                formStartIndex = i + 1;
                break;
            }
        }

        if (formStartIndex !== -1) {
            formDetails[formStartIndex] = formHtml;
        }
    });

    return JSON.stringify(formDetails, null, 2);
}

function extractUrlsAsJson() {
    const urlDetails = {
        internal: {},
        external: {}
    };

    // Get the HTML source of the entire page
    const htmlSource = document.documentElement.outerHTML;
    const lines = htmlSource.split('\n');

    // Helper function to determine if a URL is internal
    function isInternalUrl(url) {
        const pageHost = window.location.hostname;
        const link = document.createElement('a');
        link.href = url;
        return link.hostname === pageHost || !link.hostname;
    }

    // Extract URLs from anchor tags, script sources, and other tags
    const urlSelectors = [
        'a[href]:not([href^="javascript:"])',
        'script[src]',
        'link[href]',
        'iframe[src]',
        'audio[src]',
        'video[src]',
        'source[src]',
        'embed[src]',
        'object[data]'
    ];

    urlSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            let url = element.getAttribute('href') || element.getAttribute('src') || element.getAttribute('data');
            if (!url) return; // Skip if there's no URL

            // Remove invisible characters and trim spaces
            url = url.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

            // Get the line number of the URL
            const htmlFragment = element.outerHTML.split(/[\t\n\r]/g).join(' ');
            let urlStartIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(htmlFragment.substring(0, 30))) {
                    urlStartIndex = i + 1;
                    break;
                }
            }

            if (urlStartIndex !== -1) {
                const key = urlStartIndex;
                const value = url;
                if (isInternalUrl(url)) {
                    urlDetails.internal[key] = value;
                } else {
                    urlDetails.external[key] = value;
                }
            }
        });
    });

    return JSON.stringify(urlDetails, null, 2);
}

async function extractHeadersAsJson() {
    const url = window.location.href;
    const response = await fetch(url, { method: 'HEAD' });

    const headers = {};
    const interestingHeaders = [
        'x-forwarded-for',
        'x-frame-options',
        'x-xss-protection',
        'content-security-policy',
        'strict-transport-security',
        'public-key-pins',
        'referrer-policy',
        'feature-policy',
        'x-content-type-options',
        'expect-ct',
        'x-permitted-cross-domain-policies',
        'access-control-allow-origin',
        'cache-control',
        'expires',
        'pragma',
        'last-modified',
        'etag',
        'if-modified-since',
        'if-none-match',
        'server',
        'via',
        'warning',
        'x-originating-ip',
        'x-forwarded',
        'forwarded-for',
        'x-forwarded-host',
        'x-remote-ip',
        'x-remote-addr',
        'x-proxyuser-ip',
        'x-original-url',
        'client-ip',
        'x-client-ip',
        'x-host',
        'true-client-ip',
        'cluster-client-ip',
        'connection'
    ];

    const headerExplanations = {
        'x-forwarded-for': 'Identifies the originating IP address of a client connecting to a web server through an HTTP proxy or a load balancer. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-frame-options': 'Indicates whether a browser should be allowed to render a page in a <frame>, <iframe>, <embed>, or <object>. **Security Concern:** Protects against clickjacking attacks by preventing the page from being framed.',
        'x-xss-protection': 'Configures the XSS filter built into most web browsers. **Security Concern:** Helps prevent cross-site scripting attacks.',
        'content-security-policy': 'Controls resources the user agent is allowed to load for a given page. **Security Concern:** Mitigates the risk of cross-site scripting and other attacks by specifying which content sources are trusted.',
        'strict-transport-security': 'Force communication using HTTPS instead of HTTP. **Security Concern:** Protects against man-in-the-middle attacks by ensuring all communication is encrypted.',
        'public-key-pins': 'Associates a specific cryptographic public key with a certain web server to decrease the risk of MITM attacks. **Security Concern:** Protects against man-in-the-middle attacks by binding the server to a specific public key.',
        'referrer-policy': 'Governs which referrer information should be included with requests. **Security Concern:** Controls the amount of referrer information sent with requests to prevent leakage of sensitive information.',
        'feature-policy': 'Allows web developers to selectively enable, disable, and modify the behavior of certain APIs and web features in the browser. **Security Concern:** Can restrict the use of potentially dangerous APIs such as geolocation, microphone, camera, etc.',
        'x-content-type-options': 'Indicates that the MIME types advertised in the Content-Type headers should not be changed. **Security Concern:** Prevents MIME type sniffing, which can lead to security vulnerabilities.',
        'expect-ct': 'Instructs the browser to enforce Certificate Transparency. **Security Concern:** Ensures that the site\'s certificate is logged in public CT logs to prevent fraud.',
        'x-permitted-cross-domain-policies': 'Specifies if a cross-domain policy file (e.g., a Flash Player policy file) can be retrieved. **Security Concern:** Restricts which cross-domain policies are allowed to prevent data theft via cross-domain requests.',
        'access-control-allow-origin': 'Specifies which origins are permitted to read information from this server. **Security Concern:** Controls which domains can access resources to prevent cross-origin attacks.',
        'cache-control': 'Directives for caching mechanisms in both requests and responses. **Security Concern:** Proper caching can prevent sensitive data from being stored in caches, reducing the risk of information leakage.',
        'expires': 'The date/time after which the response is considered stale. **Security Concern:** Used in conjunction with caching headers to control how long data is cached, preventing outdated information from being served.',
        'pragma': 'Implementation-specific headers that may have various effects anywhere along the request-response chain. **Security Concern:** Typically used to control caching. Improper use can lead to security risks such as serving stale content.',
        'last-modified': 'The date and time at which the resource was last modified. **Security Concern:** Can be used by attackers to infer the structure and behavior of the application.',
        'etag': 'A unique identifier for a specific version of a resource. **Security Concern:** Can be used to track users across different sessions by assigning unique ETags.',
        'if-modified-since': 'Allows a 304 Not Modified to be returned if content is unchanged. **Security Concern:** Can be used by attackers to infer the structure and behavior of the application.',
        'if-none-match': 'Allows a 304 Not Modified to be returned if content is unchanged, see HTTP ETag. **Security Concern:** Can be used to track users across different sessions by assigning unique ETags.',
        'server': 'Contains information about the software used by the origin server to handle the request. **Security Concern:** Can reveal information about server software, making it easier for attackers to exploit known vulnerabilities.',
        'via': 'Informs the server of proxies through which the request was sent. **Security Concern:** Can reveal information about the proxy servers, potentially exposing them to attacks.',
        'warning': 'General warning information about possible problems. **Security Concern:** Can reveal information about issues in the response, potentially giving attackers clues about the system.',
        'x-originating-ip': 'Identifies the originating IP address of a client connecting to a web server. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-forwarded': 'Identifies the originating IP address of a client connecting to a web server through an HTTP proxy or a load balancer. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'forwarded-for': 'Identifies the original IP address of a client connecting to a web server through an HTTP proxy or a load balancer. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-forwarded-host': 'Identifies the original host requested by the client in the Host HTTP request header. **Security Concern:** Can be spoofed to hide the real host information or to bypass host-based authentication.',
        'x-remote-ip': 'Identifies the originating IP address of a client connecting to a web server. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-remote-addr': 'Identifies the originating IP address of a client connecting to a web server. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-proxyuser-ip': 'Identifies the originating IP address of a client connecting to a web server through a proxy. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-original-url': 'Identifies the original URL requested by the client. **Security Concern:** Can reveal internal URLs and paths, potentially exposing them to attacks.',
        'client-ip': 'Identifies the originating IP address of a client connecting to a web server. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-client-ip': 'Identifies the originating IP address of a client connecting to a web server. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'x-host': 'Identifies the original host requested by the client. **Security Concern:** Can be spoofed to hide the real host information or to bypass host-based authentication.',
        'true-client-ip': 'Identifies the true originating IP address of a client connecting to a web server. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'cluster-client-ip': 'Identifies the originating IP address of a client connecting to a web server through a cluster. **Security Concern:** Can be spoofed to hide the real client IP address or to bypass IP-based authentication.',
        'connection': 'Controls whether the network connection stays open after the current transaction. **Security Concern:** Improper use can lead to resource exhaustion and denial of service attacks.'
    };

    let foundInteresting = false;
    let foundExplanation = false;

    response.headers.forEach((value, name) => {
        let lowerName = name.toLowerCase();
        let headerValue = value;
        if (interestingHeaders.includes(lowerName)) {
            headerValue += ' ## INTERESTING ##';
            foundInteresting = true;
        }
        if (headerExplanations[lowerName]) {
            foundExplanation = true;
        }
        headers[name] = {
            value: headerValue,
            explanation: headerExplanations[lowerName] || 'N/A.'
        };
    });

    if (foundExplanation) {
        headers["Additional Information"] = {
            value: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/special-http-headers",
            explanation: "A reference guide for special HTTP headers."
        };
    }

    return JSON.stringify(headers, null, 2);
}

