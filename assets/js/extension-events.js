// the extension-events.js file is used to handle all the events that are global to the extension
// it works close together with: main.js, background.js and the content scripts

let currentTab = null;
let currentDomain = null;

let loaderElementIds = ["enum-tooling-spider-start-button", "enum-tooling-extract-headers"]
let totalScriptsProcessing = 0;

// async event listener for the document to load (for now only query the active tab URL)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Query the active tab in the current window
        const [tab] = await browser.tabs.query({active: true, currentWindow: true});

        // Create a new URL object from the tab's URL
        currentTab = new URL(tab.url);
        currentDomain = currentTab.hostname;  // Extract the hostname (domain)
        browser.runtime.sendMessage({command: "ping"});

        // Adjust the tab URL display
        document.querySelectorAll(".current-tab-url").forEach(function (element) {
            // Set the innerText of each element to the current URL as a string
            element.innerText = currentTab.href; // .href gives the full URL
        });

        document.querySelectorAll(".current-domain-url").forEach(function (element) {
            // Set the innerText of each element to the current URL as a string
            element.innerText = currentDomain; // .href gives the full URL
        });
    } catch (error) {
        console.error('Error querying active tab:', error);
    }
});

/**
 * initReplaceHover()
 *
 * sets all the nav left menu items to have a hover effect
 */
function initReplaceHoverNavbar() {
    replaceHover("tab-1-img", "assets/icons/navbar/", "tab-1-gen-tooling.png", "tab-1-gen-tooling-hover.png")
    replaceHover("tab-2-img", "assets/icons/navbar/", "tab-2-enum-tooling.png", "tab-2-enum-tooling-hover.png")
    replaceHover("tab-3-img", "assets/icons/navbar/", "tab-3-exploit-assistant.png", "tab-3-exploit-assistant-hover.png")
    replaceHover("tab-4-img", "assets/icons/navbar/", "tab-4-shell-assistant.png", "tab-4-shell-assistant-hover.png")
    replaceHover("tab-5-img", "assets/icons/navbar/", "tab-5-checklist-assistant.png", "tab-5-checklist-assistant-hover.png")
    replaceHover("tab-6-img", "assets/icons/navbar/", "tab-6-useful-commands.png", "tab-6-useful-commands-hover.png")
}

/**
 * replaceHover()
 *
 * @param elementId id of the element that should be replaced (img element)
 * @param prefix prefix for where to find the images
 * @param image image to use
 * @param replaceImage onhover image to use
 */
function replaceHover(elementId, prefix, image, replaceImage) {
    // add onmouseenter (hover image)
    document.getElementById(elementId).addEventListener("mouseenter", function () {
        document.getElementById(elementId).src = `${prefix}${replaceImage}`
    })

    // add onmouseleave (standard image)
    document.getElementById(elementId).addEventListener("mouseleave", function () {
        document.getElementById(elementId).src = `${prefix}${image}`
    })
}

/**
 * copyContentByClass()
 *
 * Copy content from elements using the 'copy-icon' and 'copy-icon-code' classes
 *
 */
function initCopyContentByClass() {
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('copy-icon') || event.target.classList.contains('copy-icon-code')) {
            if (activeCopyIcon) {
                activeCopyIcon.src = "assets/icons/general/copy.png";
            }

            let img = event.target;
            activeCopyIcon = img;

            // Maintain the current position and other styles
            img.style.pointerEvents = "none";

            let container = event.target.closest('div');
            if (container) {
                let contentToCopy = null;
                if (img.classList.contains('copy-icon')) {
                    let textarea = container.querySelector('textarea');
                    if (textarea) {
                        contentToCopy = textarea.value;
                    }
                } else if (img.classList.contains('copy-icon-code')) {
                    let preElement = container.querySelector('pre');
                    if (preElement) {
                        let codeElement = preElement.querySelector('code');
                        if (codeElement) {
                            contentToCopy = codeElement.textContent;
                        }
                    }
                }

                if (contentToCopy) {
                    navigator.clipboard.writeText(contentToCopy).then(function () {
                        console.log('[*] Text copied to clipboard');
                    }).catch(function (err) {
                        console.error('[*] Could not copy text: ', err);
                    });
                }

                img.src = "assets/icons/general/copy-success.png";
                setTimeout(function () {
                    if (activeCopyIcon === img) {
                        img.src = "assets/icons/general/copy.png";
                        img.style.pointerEvents = "";
                        activeCopyIcon = null;
                    }
                }, 2000);
            }
        }
    });
}

let activeCopyIcon = null;

/**
 * initRefreshControl()
 *
 * add an event listener to all elements with the class 'refresh-control'
 */
function initRefreshControl() {
    document.querySelectorAll(".refresh-control").forEach(element => {
        // Add event listener to each element
        element.addEventListener("click", function () {
            let controlRefreshState = element.getAttribute("data-control-refresh-active");
            let controlRefreshTbody = document.getElementById(element.value)

            if (controlRefreshState === "true") {
                element.classList.remove("btn-outline-danger")
                element.classList.add("btn-outline-primary")
                element.innerText = "Start refresh"
                element.setAttribute("data-control-refresh-active", "false");
                controlRefreshTbody.setAttribute("data-control-update", "false")

            } else if (controlRefreshState === "false") {
                element.classList.remove("btn-outline-primary")
                element.classList.add("btn-outline-danger")
                element.innerText = "Stop refresh"
                element.setAttribute("data-control-refresh-active", "true");
                controlRefreshTbody.setAttribute("data-control-update", "true")

            }
        });
    });
}

/**
 * initLogoControl()
 *
 * Add an event listener to the logo to change the image to a gif when hovered
 */
function initLogoControl() {
    const checkMateLogo = document.getElementById("check-mate-logo");
    let checkMateLogoHovered = false;

    checkMateLogo.addEventListener("mouseenter", function () {
        if (!checkMateLogoHovered) {
            checkMateLogoHovered = true;
            checkMateLogo.src = "assets/icons/logo.gif";
            setTimeout(function () {
                checkMateLogo.src = "assets/icons/logo.png";
                checkMateLogoHovered = false;
            }, 5330);
        }
    });
}

/**
 * initToolTip()
 *
 * initializes the bootstrap tooltip
 */
function initTooltip() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            delay: {"show": 50, "hide": 50}
        });
    });

    document.addEventListener('show.bs.tooltip', function () {
        var activeTooltips = document.querySelectorAll('.tooltip.show');
        activeTooltips.forEach(function (tooltip) {
            tooltip.tooltip('hide');
        });
    });
}


// Function to print all cookies for the monitored domain


/**
 * loaderCheck()
 *
 * checks if the loader element should be shown or should be hidden, based on the total scripts that are being processed.
 *
 * @param currentId
 * @param incrementTotalScriptsProcessing
 */
function loaderCheck(currentId, incrementTotalScriptsProcessing) {
    // loader element and see if there is a match
    let loaderElement = document.getElementById("loader")
    let match = loaderElementIds.includes(currentId)

    // decrement the total scripts processing | loader icon will hide if it reaches 0
    if (incrementTotalScriptsProcessing === false && match) {
        if (totalScriptsProcessing > 0) {
            totalScriptsProcessing -= 1;
            if (totalScriptsProcessing === 0) {
                loaderElement.classList.add("d-none")
            }
        }

        // increment the total scripts processing | loader icon will show if totalScriptsProcessing is >  0
    } else if (incrementTotalScriptsProcessing === true && match) {
        if (totalScriptsProcessing >= 0) {
            totalScriptsProcessing += 1
            loaderElement.classList.remove("d-none")
        }
    }
}

/**
 * initMessageManager()
 *
 * Initialize the message manager for the extension
 */
function initMessageManager() {
    // IDs of buttons to set event listeners on
    let browserRuntimeActionIds = [
        "enum-tooling-spider-start-button",
        "enum-tooling-highlight-forms-cp",
        "enum-tooling-highlight-inputs-cp",
        "enum-tooling-extract-comments-cp",
        "enum-tooling-extract-forms-cp",
        "enum-tooling-extract-url-cp",
        "enum-tooling-extract-headers",
        "enum-tooling-iframe-get-current-url",
        "enum-tooling-view-hidden-input",
        "exploit-assistant-csrf-checker-load-form"
    ];

    // Set event listeners for all enum-tooling on the toolbox page
    browserRuntimeActionIds.forEach(id => {
        let tmpElement = document.getElementById(id);
        if (tmpElement) {
            tmpElement.addEventListener('click', () => {
                let messageValue = tmpElement.value
                browser.runtime.sendMessage({command: messageValue, id: id});
                // these are scripts that take longer to process, e.g. spidering a website, if so, the loading icon appears on the left bottom side
                loaderCheck(id, true)
            });
        }
    });

    // Listen for messages from the background script
    browser.runtime.onMessage.addListener(async (message) => {
        // GENERAL SECTION START //
        loaderCheck(message.id, false);
        // GENERAL SECTION END

        // ## TAB 1 'general tooling' START ## //
        // ## TAB 1 'general tooling' END ## //

        // ## TAB 2 'enum tooling' START ## //
        if (message.hasOwnProperty("enumSpider")) {
            if (isValidJSON(message.enumSpider)) {
                let simplified = JSON.stringify(JSON.parse(message.enumSpider).simpleTree)
                let detailed = JSON.stringify(JSON.parse(message.enumSpider).siteTree)

                document.getElementById("enum-tooling-spider-simplified-view").value = formatJSON(simplified)
                document.getElementById("enum-tooling-spider-detailed-view").value = formatJSON(detailed)
                document.getElementById("enum-tooling-spider-output-textarea").innerText = formatJSON(simplified)
                document.getElementById("enum-tooling-spider-output-textarea").value = formatJSON(simplified)
            }
        }

        if (message.hasOwnProperty("toolboxJson")) {
            if (isValidJSON(message.toolboxJson)) {
                document.getElementById("enum-tooling-output-textarea").innerText = formatJSON(message.toolboxJson);
                document.getElementById("enum-tooling-output-textarea").value = formatJSON(message.toolboxJson);
            }
        }

        if (message.hasOwnProperty("enumToolingGetCurrentUrlIframe")) {
            // Relay the message back to the popup script
            document.getElementById("enum-tooling-iframe-url-input").innerText = message.enumToolingGetCurrentUrlIframe
            document.getElementById("enum-tooling-iframe-url-input").value = message.enumToolingGetCurrentUrlIframe
        }

        if (message.hasOwnProperty("postMessage")) {
            console.log(message.postMessage[currentTab])
            buildTableBodyFromObject(message.postMessage[currentTab], "postmessage-monitor-table-table-body", "enum-tooling-postmessage-monitor-count", false, true);
        }

        if (message.hasOwnProperty("cookieChange")) {
            buildTableBodyFromObject(message.cookieChange[currentDomain], "cookie-monitor-table-table-body", "enum-tooling-cookie-monitor-count", true);

        }
        // ## TAB 2 'enum tooling' END ## //

        // ## TAB 3 'exploit assistant' END ## //
        if (message.hasOwnProperty("exploitAssitantCSRFloadForms")) {
            let enumToolingCsrfFormsParsed = parseFormsFromJson(message.exploitAsssitantCSRFloadForms, message.domainName);
            let enumToolingCSRFRadioButtonContainerForms = document.getElementById("exploit-assistant-csrf-checker-form-radio-button-container")
            let enumToolingCSRFFormsContainerOuterDiv = document.getElementById("exploit-assistant-forms-container-outer-div")

            enumToolingCsrfFormsParsed.forEach(enumToolingCsrfFormParsed => {
                let dynamicId = generateDynamicId()
                let csrfOuterDiv = createElement("div", ["form-check", "form-check-inline", "w-100"]);
                let csrfInput = createElement("input", ["form-check-input"])
                csrfInput.setAttribute("type", "radio")
                csrfInput.setAttribute("name", "csrf-radio-button")
                csrfInput.setAttribute("id", dynamicId)

                let csrfLabel = createElement("label", ["form-check-label"])
                csrfLabel.setAttribute("for", dynamicId)
                csrfLabel.innerText = `Action: ${enumToolingCsrfFormParsed.getAttribute("action")} -- Method: ${enumToolingCsrfFormParsed.getAttribute("method")}`

                csrfOuterDiv.appendChild(csrfInput)
                csrfOuterDiv.appendChild(csrfLabel)

                csrfInput.addEventListener("click", function () {
                    // remove the old iframe element
                    enumToolingCSRFFormsContainerOuterDiv.innerHTML = ""

                    // create a new iframe element and append it to the outer-div container
                    let tmpIframeElementCSRF = createElement("iframe", ["border", "rounded", "w-100"])
                    tmpIframeElementCSRF.setAttribute("id", "exploit-assistant-csrf-checker-form-container")
                    tmpIframeElementCSRF.setAttribute("style", "min-height: 285px;")
                    enumToolingCSRFFormsContainerOuterDiv.appendChild(tmpIframeElementCSRF)

                    const csrfFormContainerDoc = tmpIframeElementCSRF.contentWindow.document;

                    // Open the document and write the initial HTML structure
                    csrfFormContainerDoc.open();
                    csrfFormContainerDoc.write(`<!DOCTYPE html>
                                            <html lang="en">
                                            <head>
                                                <meta charset="UTF-8">
                                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            </head>
                                            <body style="width: 100px !important;">
                                            </body>
                                            </html>`);

                    // Clear the body content
                    csrfFormContainerDoc.body.innerHTML = '';

                    // Append the new form
                    csrfFormContainerDoc.body.appendChild(enumToolingCsrfFormParsed);

                    // Close the document
                    csrfFormContainerDoc.close();
                })

                enumToolingCSRFRadioButtonContainerForms.appendChild(csrfOuterDiv)
            });
        }

        // ## TAB 3 'exploit assistant' END ## //

        // ## TAB 4 'shell assistant' START ## //
        // ## TAB 4 'shell assistant' END ## //

        // ## TAB 5 '' START ## //
        // ## TAB 5 '' END ## //

        // ## TAB 6 START ## //
        // ## TAB 6 END ## //

    });
}


function buildTableBodyFromObject(dataObject, tableBodyId, countId, includeHierarchy = false, jsonValue = false) {
    // Update the count element
    document.getElementById(countId).innerText = dataObject.length;

    // Get the table body element and its update attribute
    let tbody = document.getElementById(tableBodyId);
    let tbodyUpdate = tbody.getAttribute("data-control-update");

    if (tbodyUpdate === "true") {
        tbody.innerHTML = ""; // Clear the table body if update is true

        // If includeHierarchy is true, sort and group the data
        if (includeHierarchy) {
            // Remove the first record and save it
            let firstRecord = dataObject.splice(0, 1)[0];

            // Sort the remaining cookies in descending order based on the first element (assumed to be a key)
            let sortedCookies = dataObject.sort((a, b) => {
                let keyA = Object.values(a)[0];
                let keyB = Object.values(b)[0];
                return keyB.localeCompare(keyA); // Descending order
            });

            // Reinsert the first record at the beginning
            sortedCookies.unshift(firstRecord);

            // Group cookies by the first element (key)
            let groupedCookies = {};
            sortedCookies.forEach(cookieChangeObject => {
                let key = Object.values(cookieChangeObject)[0];
                if (!groupedCookies[key]) {
                    groupedCookies[key] = [];
                }
                groupedCookies[key].unshift(cookieChangeObject);
            });

            // Create rows and accordion structure
            Object.keys(groupedCookies).forEach(key => {
                let group = groupedCookies[key];

                // Create a row for the first element
                let mainRow = createElement("tr", []);
                let mainCell = createElement("td", ["btn-link"]);
                mainCell.style.cssText = "overflow-wrap: break-word; max-width: 200px; cursor: pointer;";
                mainCell.colSpan = Object.keys(group[0]).length; // Span across all columns
                mainCell.innerText = key;

                // Store the group in a data attribute for later retrieval
                mainCell.dataset.group = JSON.stringify(group);
                mainRow.appendChild(mainCell);
                tbody.appendChild(mainRow);

                // Add click event to toggle visibility of hidden rows and keep headers untouched
                mainCell.addEventListener("click", () => {
                    let isExpanded = mainCell.dataset.expanded === "true";

                    // Toggle stripe classes to maintain the striped appearance
                    let toggleStripeClass = () => {
                        let rows = tbody.querySelectorAll("tr");
                        rows.forEach((row, index) => {
                            row.classList.toggle("striped", index % 2 === 0);
                        });
                    };

                    if (isExpanded) {
                        // If expanded, remove the additional rows
                        let nextRow = mainRow.nextElementSibling;
                        while (nextRow && nextRow.classList.contains("additional-row")) {
                            tbody.removeChild(nextRow);
                            nextRow = mainRow.nextElementSibling;
                        }

                        mainCell.dataset.expanded = "false";
                    } else {
                        let groupData = JSON.parse(mainCell.dataset.group);
                        groupData.forEach(cookieChangeObject => {
                            let additionalRow = createElement("tr", ["additional-row"]);

                            for (let [key, value] of Object.entries(cookieChangeObject)) {
                                let cell = createElement("td", []);
                                cell.style.cssText = "overflow-wrap: break-word; max-width: 200px;";
                                cell.innerText = jsonValue ? JSON.stringify(value) : value;
                                additionalRow.appendChild(cell);
                            }

                            // Insert the additional row after the main row
                            tbody.insertBefore(additionalRow, mainRow.nextSibling);
                        });

                        mainCell.dataset.expanded = "true";
                    }

                    // Apply the striping again
                    toggleStripeClass();
                });
            });
        } else {
            // If includeHierarchy is false, simply add the rows without grouping
            dataObject.forEach(cookieChangeObject => {
                let row = createElement("tr", []);

                Object.values(cookieChangeObject).forEach(value => {
                    let cell = createElement("td", []);
                    cell.style.cssText = "overflow-wrap: break-word; max-width: 200px;";
                    cell.innerText = jsonValue ? JSON.stringify(value) : value;
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });
        }

        applySeeMoreToTableCells(tbody);
    }
}







