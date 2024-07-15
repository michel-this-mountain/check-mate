// script that gets injected in the specified urls (manifest.json)
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.command === "getDomainName") {
        let comments = extractCommentsFromCurrentPage()

        // Send the domain name back to the background script
        browser.runtime.sendMessage({domainName: await initSpider()});
        // browser.runtime.sendMessage({domainName: await extractCommentsFromCurrentPage()});

    }
});


async function spiderWebsite(startUrl, maxDepth = 2) {
    const visited = new Set();
    const siteTree = {};

    async function visitPage(currentUrl, depth) {
        if (depth > maxDepth || visited.has(currentUrl)) {
            return;
        }

        visited.add(currentUrl);

        try {
            const response = await fetch(currentUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            const links = Array.from(doc.querySelectorAll('a[href]')).map(link => new URL(link.href, currentUrl).href);
            const filteredLinks = [...new Set(links.filter(link => link.startsWith(startUrl) && !visited.has(link)))];

            const currentPath = new URL(currentUrl).pathname;

            let currentLevel = siteTree;
            currentPath.split('/').filter(Boolean).forEach(segment => {
                if (!currentLevel[segment]) {
                    currentLevel[segment] = {};
                }
                currentLevel = currentLevel[segment];
            });

            for (const link of filteredLinks) {
                await visitPage(link, depth + 1);
            }
        } catch (error) {
            console.error(`Error visiting ${currentUrl}: ${error.message}`);
        }
    }

    await visitPage(startUrl, 0);

    return siteTree;
}

async function initSpider() {
    const startUrl = window.location.href; // Use the current URL as the start URL
    const siteTree = await spiderWebsite(startUrl, 2);

     // Convert the tree structure to a JSON string
    return JSON.stringify(siteTree, null, 2); // Return the JSON string
}

// treeStructureJson will now hold the JSON string after initSpider resolves

/**
 * extractCommentsFromCurrentPage()
 *
 * Extract all the comments, multiline or singleline, in javascript or html from the current page
 *
 * @returns {string}
 */
function extractCommentsFromCurrentPage() {
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
        return { lineNumber, comment: comment[0].trim() };
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