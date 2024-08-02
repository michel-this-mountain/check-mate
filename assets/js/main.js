// loaderElementIds = these are the IDS due to the time, the loader icon will appear on the left bottomside.
// totalScriptsProcessing = this variable keeps track on how many processes are running. If the value > 0, the loader icon will show, otherwise it does not show.
let loaderElementIds = ["enum-tooling-spider-start-button", "enum-tooling-extract-headers"]
let totalScriptsProcessing = 0;
let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Query the active tab in the current window
        const [tab] = await browser.tabs.query({active: true, currentWindow: true});

        // Create a new URL object
        currentTab = String(new URL(tab.url));

        // adjust the tab url
        document.querySelectorAll(".current-tab-url").forEach(function (element) {
            // Set the innerText of each element to the current URL
            element.innerText = currentTab;
        });
    } catch (error) {
        console.error('Error querying active tab:', error);
    }
});

document.addEventListener('DOMContentLoaded', () => {
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
            document.getElementById("enum-tooling-postmessage-monitor-count").innerText = message.postMessage[currentTab].length;
            let tbody = document.getElementById("postmessage-monitor-table-table-body");
            let tbodyUpdate = tbody.getAttribute("data-control-update")

            message.postMessage[currentTab].forEach((postMessageObject, index) => {
                let postMessageTr = createElement("tr", [])

                for (let key of Object.keys(postMessageObject)) {
                    let postMessageChangeTd = createElement("td", [])
                    if (key === "message") {
                        postMessageChangeTd.innerText = JSON.stringify(postMessageObject[key])
                    } else {
                        postMessageChangeTd.innerText = postMessageObject[key]
                    }
                    postMessageTr.appendChild(postMessageChangeTd)
                }
                if (tbodyUpdate === "true") {
                    if (index === 0) {
                        tbody.innerHTML = ""
                    }
                    tbody.appendChild(postMessageTr)
                    applySeeMoreToTableCells(tbody)
                }
            })

        }

        if (message.hasOwnProperty("cookieChange")) {
            document.getElementById("enum-tooling-cookie-monitor-count").innerText = message.cookieChange[currentTab].length;
            let tbody = document.getElementById("cookie-monitor-table-table-body");
            let tbodyUpdate = tbody.getAttribute("data-control-update")

            message.cookieChange[currentTab].forEach((cookieChangeObject, index) => {
                let cookieChangeTr = createElement("tr", [])

                for (let key of Object.keys(cookieChangeObject)) {
                    let cookieChangeTd = createElement("td", [])
                    cookieChangeTd.innerText = cookieChangeObject[key]
                    cookieChangeTr.appendChild(cookieChangeTd)
                }

                if (tbodyUpdate === "true") {
                    if (index === 0) {
                        tbody.innerHTML = ""
                    }
                    tbody.appendChild(cookieChangeTr)
                    applySeeMoreToTableCells(tbody)
                }
            })
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

    // ##### PERSIST DATA START ##### //
    persistDataMonitor()
    // ##### PERSIST DATA END ##### //

    // ##### CODE HIGHLIGHTING START ##### //
    insertIpInHighlight();
    // ##### CODE HIGHLIGHTING END ##### //

    // ##### TABLE SORT AND SEARCH START ##### //
    makeAllTablesSortable()

    searchTable("search-postmessage-input", "postmessage-monitor-table")
    searchTable("search-cookie-monitor-input", "cookie-monitor-table")

    // ##### TABLE SORT AND SEARCH END ##### //

});

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
 * saveElementsToLocalStorage()
 *
 * save the different kind of html elements that need to be persistent to localstorage
 */
function saveElementsToLocalStorage() {
    // Save all textareas
    let PD_textareas = document.querySelectorAll('textarea');
    PD_textareas.forEach(function (PD_textarea) {
        let PD_id = PD_textarea.id;
        localStorage.setItem(PD_id, PD_textarea.value);
    });

    // Save all checkboxes (excluding 'persist-data-checkbox')
    let PD_checkboxes = document.querySelectorAll('input[type="checkbox"]');
    PD_checkboxes.forEach(function (PD_checkbox) {
        let PD_id = PD_checkbox.id;
        if (PD_id !== 'persist-data-checkbox') {
            localStorage.setItem(PD_id, PD_checkbox.checked);
        }
    });

    // Save all buttons
    let PD_buttons = document.querySelectorAll('button');
    PD_buttons.forEach(function (PD_button) {
        let PD_id = PD_button.id;
        localStorage.setItem(PD_id, PD_button.value);
    });

    // Save all select menus
    let PD_selects = document.querySelectorAll('select');
    PD_selects.forEach(function (PD_select) {
        let PD_id = PD_select.id;
        localStorage.setItem(PD_id, PD_select.value);
    });

    // Save all code blocks
    let PD_codeBlocks = document.querySelectorAll('code');
    PD_codeBlocks.forEach(function (PD_codeBlock) {
        let PD_id = PD_codeBlock.id;
        localStorage.setItem(PD_id, PD_codeBlock.textContent);
    });
}

/**
 * loadElementsFromLocalStorage()
 *
 * loads the different kind of html elements that need to be persistent from localstorage
 */
function loadElementsFromLocalStorage() {
    // Load all textareas
    let PD_textareas = document.querySelectorAll('textarea');
    PD_textareas.forEach(function (PD_textarea) {
        let PD_id = PD_textarea.id;
        let PD_savedValue = localStorage.getItem(PD_id);
        if (PD_savedValue !== null) {
            let PD_tmpElement = document.getElementById(PD_id);
            PD_tmpElement.value = PD_savedValue;
            if (isValidJSON(PD_tmpElement.value)) {
                PD_tmpElement.value = formatJSON(PD_tmpElement.value);
            }
        }
    });

    // Load all checkboxes (excluding 'persist-data-checkbox')
    let PD_checkboxes = document.querySelectorAll('input[type="checkbox"]');
    PD_checkboxes.forEach(function (PD_checkbox) {
        let PD_id = PD_checkbox.id;
        if (PD_id !== 'persist-data-checkbox') {
            let PD_savedChecked = localStorage.getItem(PD_id) === 'true';
            PD_checkbox.checked = PD_savedChecked;
        }
    });

    // Load all buttons
    let PD_buttons = document.querySelectorAll('button');
    PD_buttons.forEach(function (PD_button) {
        let PD_id = PD_button.id;
        let PD_savedValue = localStorage.getItem(PD_id);
        if (PD_savedValue !== null) {
            PD_button.value = PD_savedValue;
        }
    });

    // Load all select menus
    let PD_selects = document.querySelectorAll('select');
    PD_selects.forEach(function (PD_select) {
        let PD_id = PD_select.id;
        let PD_savedValue = localStorage.getItem(PD_id);
        if (PD_savedValue !== null) {
            PD_select.value = PD_savedValue;
        }
    });

    // Load all code blocks
    let PD_codeBlocks = document.querySelectorAll('code');
    PD_codeBlocks.forEach(function (PD_codeBlock) {
        let PD_id = PD_codeBlock.id;
        let PD_savedValue = localStorage.getItem(PD_id);
        if (PD_savedValue !== null) {
            PD_codeBlock.textContent = PD_savedValue;
        }
    });
}

/**
 * removeElementsFromLocalStorage()
 *
 * remove the different kind of html elements from localstorage
 */
function removeElementsFromLocalStorage() {
    // Remove all textareas
    let PD_textareas = document.querySelectorAll('textarea');
    PD_textareas.forEach(function (PD_textarea) {
        let PD_id = PD_textarea.id;
        localStorage.removeItem(PD_id);
    });

    // Remove all checkboxes (excluding 'persist-data-checkbox')
    let PD_checkboxes = document.querySelectorAll('input[type="checkbox"]');
    PD_checkboxes.forEach(function (PD_checkbox) {
        let PD_id = PD_checkbox.id;
        if (PD_id !== 'persist-data-checkbox') {
            localStorage.removeItem(PD_id);
        }
    });

    // Remove all buttons
    let PD_buttons = document.querySelectorAll('button');
    PD_buttons.forEach(function (PD_button) {
        let PD_id = PD_button.id;
        localStorage.removeItem(PD_id);
    });

    // Remove all select menus
    let PD_selects = document.querySelectorAll('select');
    PD_selects.forEach(function (PD_select) {
        let PD_id = PD_select.id;
        localStorage.removeItem(PD_id);
    });

    // Remove all code blocks
    let PD_codeBlocks = document.querySelectorAll('code');
    PD_codeBlocks.forEach(function (PD_codeBlock) {
        let PD_id = PD_codeBlock.id;
        localStorage.removeItem(PD_id);
    });
}

/**
 * setupMutationObserver
 *
 * sets up the mutationobserver. Watches changes across the different kind of elements that are relevant
 */
function setupMutationObserver() {
    let PD_observer = new MutationObserver(function (PD_mutations) {
        PD_mutations.forEach(function (PD_mutation) {
            if (PD_mutation.target.tagName.toLowerCase() === 'textarea' ||
                (PD_mutation.target.tagName.toLowerCase() === 'input' && PD_mutation.target.type === 'checkbox' && PD_mutation.target.id !== 'persist-data-checkbox') ||
                PD_mutation.target.tagName.toLowerCase() === 'button' ||
                PD_mutation.target.tagName.toLowerCase() === 'select' ||
                PD_mutation.target.tagName.toLowerCase() === 'code') {
                saveElementsToLocalStorage();
            }
        });
    });

    let PD_config = {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true
    };

    document.querySelectorAll('textarea, input[type="checkbox"], button, select, code').forEach(function (PD_element) {
        if (!(PD_element.tagName.toLowerCase() === 'input' && PD_element.id === 'persist-data-checkbox')) {
            PD_observer.observe(PD_element, PD_config);
        }
    });

    // Add change event listeners for checkboxes to ensure state changes are saved
    document.querySelectorAll('input[type="checkbox"]').forEach(function (PD_checkbox) {
        if (PD_checkbox.id !== 'persist-data-checkbox') {
            PD_checkbox.addEventListener('change', function () {
                saveElementsToLocalStorage();
            });
        }
    });

    // Add change event listeners for select menus
    document.querySelectorAll('select').forEach(function (PD_select) {
        PD_select.addEventListener('change', function () {
            saveElementsToLocalStorage();
        });
    });

    saveElementsToLocalStorage();
}


/**
 * parseFormsFromJson()
 *
 * Parse JSON string containing HTML forms and return them as HTML elements.
 * If the form's action attribute is a relative path, update it to the current domain/path.
 * @param {string} jsonString - The JSON string with form details.
 * @param {string} currentDomain - the current domain the user is on
 * @returns {HTMLElement[]} An array of parsed form elements.
 */
function parseFormsFromJson(jsonString, currentDomain) {
    const formDetails = JSON.parse(jsonString);
    const formElements = [];

    Object.values(formDetails).forEach(formHtml => {
        const formElement = document.createElement('div');
        formElement.innerHTML = formHtml;
        const form = formElement.querySelector('form');

        if (form) {
            const action = form.getAttribute('action');
            if (action && !(action.startsWith('http://') || action.startsWith('https://'))) {
                if (action[0] === "/") {
                    form.setAttribute('action', `${currentDomain}${action}`);
                } else {
                    form.setAttribute('action', `${currentDomain}/${action}`);
                }
                form.setAttribute("target", "_blank")
            }
            formElements.push(form);
        }
    });

    return formElements;
}

/**
 * createElement()
 *
 * Creates an element with the specified classes.
 *
 * @param {string} elementName - The name of the element to create.
 * @param {string[]} classes - An array of class names to add to the element.
 * @returns {HTMLElement} The created element with the specified classes.
 */
function createElement(elementName, classes) {
    const e = document.createElement(elementName);
    for (let index = 0; index < classes.length; index++) {
        e.classList.add(classes[index]);
    }
    return e;
}

/**
 * generateDynamicId()
 *
 * @returns a random dynamic ID
 */
function generateDynamicId() {
    return `${Math.floor((Math.random() * 999999) + 1)}${Math.random().toString(36)}${Math.floor((Math.random() * 999999) + 1)}${Math.random().toString(36)}${Math.floor((Math.random() * 999999) + 1)}`
}

/**
 * searchTable : searches for a value specific in a table. The number of columns or rows do not matter
 *
 * @param {*} inputFieldId id of the input field (no hashtag)
 * @param {*} tableId id of the table (no hashtag)
 */
function searchTable(inputFieldId, tableId) {
    $(document).ready(function () {
        $(`#${inputFieldId}`).on("keyup", function () {
            var value = $(this).val().toLowerCase();
            $(`#${tableId} tbody tr`).filter(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
            });
        });
    });
}

/**
 * searchList : searches for a value specific in a list.
 *
 * @param {*} inputFieldId id of the input field (no hashtag)
 * @param {*} listId id of the list (no hashtag)
 */
function searchList(inputFieldId, listId) {
    $(document).ready(function () {
        $(`#${inputFieldId}`).on("keyup", function () {
            var value = $(this).val().toLowerCase();
            $(`#${listId} li`).filter(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
            });
        });
    });
}

/**
 * makeAllTablesSortable()
 *
 * adds the possibility to sort ascending or descending based on a table column
 */
function makeAllTablesSortable() {
    let currentSortColumn = null;
    let sortDirection = 1; // 1 for ascending, -1 for descending

    // Function to sort the table
    function sortTable(table, columnIndex) {
        const rows = Array.from(table.tBodies[0].rows);

        if (currentSortColumn === columnIndex) {
            sortDirection *= -1; // Reverse sort direction
        } else {
            sortDirection = 1; // Default to ascending
        }

        currentSortColumn = columnIndex;

        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[columnIndex].innerText;
            const cellB = rowB.cells[columnIndex].innerText;

            if (!isNaN(cellA) && !isNaN(cellB)) {
                return (cellA - cellB) * sortDirection;
            }

            return cellA.localeCompare(cellB) * sortDirection;
        });

        // Update the table with sorted rows
        const tbody = table.tBodies[0];
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }

        tbody.append(...rows);

        // Update sort icons
        updateSortIcons(table, columnIndex);
    }

    // Function to update sort icons
    function updateSortIcons(table, columnIndex) {
        const headers = table.querySelectorAll("th .sort-icon");
        headers.forEach((icon, index) => {
            if (index === columnIndex) {
                icon.innerHTML = sortDirection === 1 ? "&#9650;" : "&#9660;";
            } else {
                icon.innerHTML = "&#9650;"; // Default to ascending icon
            }
        });
    }

    // Initialize the sorting functionality on all tables
    document.querySelectorAll("table").forEach(table => {
        table.querySelectorAll("th").forEach((header, index) => {
            // Add a span for the sort icon if not already present
            if (!header.querySelector(".sort-icon")) {
                const sortIcon = document.createElement("span");
                sortIcon.className = "sort-icon";
                sortIcon.innerHTML = "&#9650;"; // Default to ascending icon
                header.appendChild(sortIcon);
            }
            header.addEventListener("click", () => sortTable(table, index));
        });
    });
}

/**
 * applySeeMoreToTableCells()
 *
 * updates the table cells to have a max length of 300, if longer, the "see-more" will be shown
 */
/**
 * applySeeMoreToTableCells()
 *
 * updates the table cells in the given table body to have a max length of 300, if longer, the "see-more" will be shown
 *
 * @param {HTMLElement} tableBody - The table body element to apply the "see more" functionality to.
 */
function applySeeMoreToTableCells(tableBody) {
    const maxLength = 300;

    // Function to create "see more" and "see less" elements
    function createSeeMoreElement(fullText) {
        const shortText = fullText.slice(0, maxLength);

        const spanShort = document.createElement('span');
        spanShort.className = 'see-more-short';
        spanShort.textContent = shortText;

        const spanFull = document.createElement('span');
        spanFull.className = 'see-more-content';
        spanFull.textContent = fullText;

        const linkToggle = document.createElement('span');
        linkToggle.className = 'see-more';
        linkToggle.textContent = '...see more';

        linkToggle.addEventListener('click', () => {
            if (spanFull.style.display === 'none') {
                spanFull.style.display = 'inline';
                spanShort.style.display = 'none';
                linkToggle.textContent = 'see less';
            } else {
                spanFull.style.display = 'none';
                spanShort.style.display = 'inline';
                linkToggle.textContent = '...see more';
            }
        });

        const container = document.createElement('div');
        container.appendChild(spanShort);
        container.appendChild(spanFull);
        container.appendChild(linkToggle);

        // Initially show only the short text
        spanFull.style.display = 'none';

        return container;
    }

    // Apply the "see more" functionality to all table cells in the given table body
    tableBody.querySelectorAll('tr td').forEach(cell => {
        const cellText = cell.textContent.trim();
        if (cellText.length > maxLength) {
            const seeMoreElement = createSeeMoreElement(cellText);
            cell.innerHTML = ''; // Clear the cell content
            cell.appendChild(seeMoreElement);
        }
    });
}

/**
 * persistDataMonitor()
 *
 * method that implements handlers that checks if the persistDataSwitch is being toggled,
 * if so, apply the correct handling of saving data in the plugin
 */
function persistDataMonitor() {
    let persistDataSwitch = document.getElementById("persist-data-checkbox")

    // set the toggle to checked if the value is set to true
    if (localStorage.getItem("persistDataSwitch") === "true") {
        persistDataSwitch.setAttribute("checked", true)
        loadElementsFromLocalStorage()
        setupMutationObserver()
    } else {
        removeElementsFromLocalStorage()
    }

    // add an event listener that toggles the switch to true or false
    persistDataSwitch.addEventListener("change", function () {
        if (persistDataSwitch.hasAttribute("checked")) {
            persistDataSwitch.removeAttribute("checked")
            localStorage.setItem("persistDataSwitch", false)
        } else {
            persistDataSwitch.setAttribute("checked", true)
            localStorage.setItem("persistDataSwitch", true)
            setupMutationObserver()
        }
    });
}

/**
 * escapeHTML()
 *
 * Escapes special HTML characters in a string to their corresponding HTML entities.
 *
 * @param {string} str - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}

/**
 * insertIpInHighlight()
 *
 * Inserts the IP address of the current tab into the highlighted code blocks.
 */
function insertIpInHighlight() {
    // Ensure reverseShells object is defined and accessible
    if (typeof reverseShells === 'undefined' || !reverseShells.reverse_shell) {
        console.error('reverseShells object is not defined or does not contain reverse_shell property.');
    } else {
        // Get the IP, port, and other required elements
        let localIp = document.getElementById("shell-assistant-local-ip");
        let localPort = document.getElementById("shell-assistant-local-port");
        let selectMenuLanguageTool = document.getElementById("shell-assistant-select-menu-language-tool");
        let selectMenuShellType = document.getElementById("shell-assistant-select-menu-reverse-shell");

        // Append an empty element (disabled) so that the user must choose a language

        let languageOptionDisabled = document.createElement("option");
        languageOptionDisabled.text = "Choose language";
        languageOptionDisabled.setAttribute("disabled", "true");
        languageOptionDisabled.setAttribute("selected", "true");
        selectMenuLanguageTool.appendChild(languageOptionDisabled);

        // Populate selectMenuLanguageTool with options from reverseShells
        Object.keys(reverseShells.reverse_shell).forEach(key => {
            let option = document.createElement("option");
            option.text = key;
            option.value = key;
            selectMenuLanguageTool.appendChild(option);
        });

        // Append an empty element (disabled) so that the user must choose a reverse shell
        let shellOptionDisabled = document.createElement("option");
        shellOptionDisabled.text = "Choose reverse shell";
        shellOptionDisabled.setAttribute("disabled", "true");
        shellOptionDisabled.setAttribute("selected", "true");
        selectMenuShellType.appendChild(shellOptionDisabled);

        // Event listener for selectMenuLanguageTool changes
        selectMenuLanguageTool.addEventListener("change", function () {
            let selectMenuLanguagetoolValue = selectMenuLanguageTool.value;
            selectMenuShellType.innerHTML = "";

            // Append the disabled option again
            let shellOptionDisabled = document.createElement("option");
            shellOptionDisabled.text = "Choose reverse shell";
            shellOptionDisabled.setAttribute("disabled", "true");
            shellOptionDisabled.setAttribute("selected", "true");
            selectMenuShellType.appendChild(shellOptionDisabled);

            // Populate selectMenuShellType with options based on selected language
            reverseShells.reverse_shell[selectMenuLanguagetoolValue].forEach(shell => {
                let option = document.createElement("option");
                option.text = shell.title;
                option.value = shell.command;
                option.setAttribute("data-cm-language", shell.highlight);
                selectMenuShellType.appendChild(option);
            });
            saveElementsToLocalStorage();
        });

        document.querySelectorAll('code').forEach((el) => {
            hljs.highlightElement(el);
        });

        // Event listener for selectMenuShellType changes
        selectMenuShellType.addEventListener("change", function () {
            replaceAndBuildCodeElement();
            saveElementsToLocalStorage();
        });

        // Event listener for localIp changes
        localIp.addEventListener("input", function () {
            replaceAndBuildCodeElement();
            saveElementsToLocalStorage()
        });

        // Event listener for localPort changes
        localPort.addEventListener("input", function () {
            replaceAndBuildCodeElement();
            saveElementsToLocalStorage()
        });

        // Function to build and replace the code element
        function buildCodeElement(oldCodeElement, language) {
            let codeElement = document.createElement("code");
            codeElement.classList.add("rounded", language);
            codeElement.setAttribute("style", oldCodeElement.getAttribute("style"));
            codeElement.setAttribute("id", oldCodeElement.getAttribute("id"));
            codeElement.textContent = oldCodeElement.textContent;

            return codeElement;
        }

        function replaceAndBuildCodeElement() {
            let oldCodeElement = document.getElementById("shell-assistant-reverse-shell-code-element");
            let commandTemplate = selectMenuShellType.value.replace(/{ip}/g, localIp.value).replace(/{port}/g, localPort.value);
            oldCodeElement.textContent = commandTemplate;
            oldCodeElement.parentNode.replaceChild(buildCodeElement(oldCodeElement, selectMenuShellType.options[selectMenuShellType.selectedIndex].getAttribute("data-cm-language")), oldCodeElement);

            document.querySelectorAll('code').forEach((el) => {
                hljs.highlightElement(el);
            });
        }
    }
}

