// main.js is used for building up the functionality of the plugin, and is the base for methods that are globally used
// across the plugin

document.addEventListener('DOMContentLoaded', () => {

    // init/build the content for the shell assistant tabs (reverse, bind, transfer)
    initShellAssistantContent()

    // init checklist assistant content
    initChecklistAssistantContent()

    // make all tables sortable
    makeAllTablesSortable()

    // search functionality for tabkes
    searchTable("search-postmessage-input", "postmessage-monitor-table")
    searchTable("search-cookie-monitor-input", "cookie-monitor-table")

    // manage the state of all accordions
    manageAllAccordions();

    // init/build the persistDataMonitor
    persistDataMonitor();
});

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
}

/**
 * initShellAssistantContent()
 *
 * init the content for the shell assistant tabs
 */
function initShellAssistantContent() {
    // reverse shell code highlighting
    buildShellAssistantContent(
        "shell-assistant-local-ip",
        "shell-assistant-local-port",
        "shell-assistant-select-menu-language-tool",
        "shell-assistant-select-menu-reverse-shell",
        "shell-assistant-reverse-shell-code-element",
        reverseShells,
        "reverse_shell",
        "Select language/ tool",
        "Select reverse shell"
    );

    // bind shell code highlighting
    buildShellAssistantContent(
        "shell-assistant-bs-local-ip",
        "shell-assistant-bs-local-port",
        "shell-assistant-bs-select-menu-language-tool",
        "shell-assistant-bs-select-menu-reverse-shell",
        "shell-assistant-bs-code-element",
        bindShells,
        "bind_shell",
        "Select language/ tool",
        "Select bind shell"
    );

    // transfer methods code highlighting
    buildShellAssistantContent(
        "shell-assistant-tm-local-ip",
        "shell-assistant-tm-local-port",
        "shell-assistant-tm-select-menu-language-tool",
        "shell-assistant-tm-select-menu-reverse-shell",
        "shell-assistant-tm-code-element",
        transferMethods,
        "transfer_files",
        "Select platform",
        "Select transfer method",
        "shell-assistant-tm-filepath",
        "shell-assistant-tm-filename"
    );
}

/**
 * insertIpInHighlight()
 *
 * Inserts an IP address and port number into a code block, highlighting the code block based on the selected language/tool.
 *
 * @param localIpId = The ID of the input field for the local IP address.
 * @param localPortId = The ID of the input field for the local port number.
 * @param selectMenuLanguageToolId = The ID of the select menu for the language/tool selection.
 * @param selectMenuShellTypeId = The ID of the select menu for the shell type selection.
 * @param codeElementId = The ID of the code element to insert the code into.
 * @param JsonObjectVar = The JSON object containing the various details.
 * @param firstKey = firstkey of the json object to use e.g. reverse_shell, bind_shell, transfer_files
 * @param firstSelectText = The text to display in the first select menu.
 * @param secondSelectText = The text to display in the second select menu.
 * @param optionalFilePathId = The ID of the input field for the file path.
 * @param optionalNewFilenameId = The ID of the input field for the new filename.
 */
function buildShellAssistantContent(localIpId, localPortId, selectMenuLanguageToolId, selectMenuShellTypeId, codeElementId, JsonObjectVar, firstKey, firstSelectText, secondSelectText, optionalFilePathId = null, optionalNewFilenameId = null) {
    if (!JsonObjectVar || !JsonObjectVar[firstKey]) {
        console.error('[*][CM] JsonObjectVar object is not defined or does not contain the correct property.');
        return;
    }

    // get the elements that are required
    const localIp = document.getElementById(localIpId);
    const localPort = document.getElementById(localPortId);
    const selectMenuLanguageTool = document.getElementById(selectMenuLanguageToolId);
    const selectMenuShellType = document.getElementById(selectMenuShellTypeId);

    // if the filepath and filename variables are set, get the elements
    const filePath = optionalFilePathId === null ? null : document.getElementById(optionalFilePathId);
    const newFilename = optionalNewFilenameId === null ? null : document.getElementById(optionalNewFilenameId);

    if (!localIp || !localPort || !selectMenuLanguageTool || !selectMenuShellType) {
        console.error('[*][CM] One or more required elements are not found in the DOM.');
        return;
    }

    // add event listeners to the input fields
    if (filePath && newFilename) {
        if (!filePath || !newFilename) {
            console.error('[*][CM] One or more required elements are not found in the DOM.');
            return;
        } else {
            filePath.addEventListener("input", replaceAndBuildCodeElement);
            newFilename.addEventListener("input", replaceAndBuildCodeElement);
        }
    }

    // apply a disabled select option to both the select menus
    selectMenuLanguageTool.appendChild(buildDisabledSelectOption(firstSelectText));
    selectMenuShellType.appendChild(buildDisabledSelectOption(secondSelectText));

    // iterate over the reverse shell objects and populate the select menus
    Object.keys(JsonObjectVar[firstKey]).forEach(key => {
        const option = new Option(key, key);
        selectMenuLanguageTool.appendChild(option);

        if (localStorage.getItem(selectMenuLanguageToolId) === key) {
            option.selected = true;
            document.getElementById(codeElementId).classList.add(JsonObjectVar[firstKey][key][0].highlight);
            populateShellTypeOptions(JsonObjectVar[firstKey][key]);
        }
    });

    // add event listeners to the select menus
    selectMenuLanguageTool.addEventListener("change", () => {
        selectMenuShellType.innerHTML = "";
        selectMenuShellType.appendChild(buildDisabledSelectOption(secondSelectText));
        populateShellTypeOptions(JsonObjectVar[firstKey][selectMenuLanguageTool.value]);
    });

    // when the shell changes, update the code field
    selectMenuShellType.addEventListener("change", () => {
        replaceAndBuildCodeElement();
    });

    localIp.addEventListener("input", replaceAndBuildCodeElement);
    localPort.addEventListener("input", replaceAndBuildCodeElement);

    function populateShellTypeOptions(shells) {
        shells.forEach(shell => {
            const option = new Option(shell.title, shell.command);
            option.dataset.cmLanguage = shell.highlight;
            selectMenuShellType.appendChild(option);

            if (localStorage.getItem(selectMenuShellTypeId) === shell.command) {
                option.selected = true;
            }
        });
    }

    function replaceAndBuildCodeElement() {
        const oldCodeElement = document.getElementById(codeElementId);
        if (!oldCodeElement) {
            console.error('[*][CM] Code element not found in the DOM.');
            return;
        }

        const newCodeElement = buildCodeElement(oldCodeElement, selectMenuShellType.selectedOptions[0]?.dataset.cmLanguage);

        let localIpValue = localIp.value.length > 0 ? localIp.value : "{ip}";
        let localPortValue = localPort.value.length > 0 ? localPort.value : "{port}";

        if (filePath && newFilename) {

            let filePathValue = filePath.value.length > 0 ? filePath.value : "{filepath}";
            let newFileNameValue = newFilename.value.length > 0 ? newFilename.value : "{newfilename}";

            newCodeElement.textContent = selectMenuShellType.value.replace(/{ip}/g, localIpValue).replace(/{port}/g, localPortValue).replace(/{filepath}/g, filePathValue).replace(/{newfilename}/g, newFileNameValue);
        } else {
            newCodeElement.textContent = selectMenuShellType.value.replace(/{ip}/g, localIpValue).replace(/{port}/g, localPortValue);
        }
        oldCodeElement.replaceWith(newCodeElement);
        // Uncomment if using highlight.js
        hljs.highlightElement(newCodeElement);
    }

    function buildCodeElement(oldCodeElement, language) {
        const codeElement = document.createElement("code");
        codeElement.className = `rounded ${language} p-2 h-100`;
        codeElement.style = oldCodeElement.style;
        codeElement.id = oldCodeElement.id;
        codeElement.textContent = oldCodeElement.textContent;
        return codeElement;
    }
}

/**
 * buildChecklists()
 *
 * Builds a disabled select option element with the specified text content.
 *
 * @param textContent
 * @returns {HTMLOptionElement}
 */
function buildDisabledSelectOption(textContent) {
    const option = new Option(textContent, "", true, true);
    option.disabled = true;
    return option;
}


/**
 * captureAndCopyCodeElementToClipboard()
 *
 * screenshot an code element with html2canvas
 */
function captureAndCopyCodeElementToClipboard(element, language) {
    // Create a deep clone of the original element
    const clone = buildCodeElement(element, language);

    // Apply styles to the clone to ensure all content is visible
    clone.style.position += 'fixed';
    clone.style.top += '0';
    clone.style.left += '0';
    clone.style.width += '125%';
    clone.style.overflow += 'visible'; // Ensure no content is hidden
    clone.style.zIndex += '-9999'; // Make sure the clone doesn't interfere with the layout
    clone.style.whiteSpace = 'pre-wrap'; // Preserve whitespace and wrap long lines

    // Append the clone to the body (off-screen)
    document.body.appendChild(clone);

    // Use html2canvas to capture the clone
    html2canvas(clone, {
        width: clone.scrollWidth,
        height: clone.scrollHeight
    }).then(function (canvas) {
        // Convert the canvas to a Blob
        canvas.toBlob(function (blob) {
            // Use the Clipboard API to write the Blob to the clipboard
            navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]).then(function () {
                console.log('Image copied to clipboard');
            }).catch(function (error) {
                console.error('Error copying image to clipboard:', error);
            });
        });

        // Remove the clone after capturing
        document.body.removeChild(clone);
    }).catch(function (error) {
        console.error('Error capturing the element:', error);

        // Ensure the clone is removed even in case of an error
        document.body.removeChild(clone);
    });
};
