// main.js is used for building up the functionality of the plugin, and is the base for methods that are globally used
// across the plugin

document.addEventListener('DOMContentLoaded', () => {
    // highlight all code elements if it is possible (those that do not require an event listener)
    hljs.highlightAll();

    // init the event listeners for the nav menu on the left (global)
    initEventListeners([
        initReplaceHoverNavbar,
        initTabPersistence,
        initCopyContentByClass,
        initResetContentByClass,
        initLogoControl,
        initRefreshControl,
        initTooltip
    ]
    )

    // init the message manager (global)
    initMessageManager();

    // init/build the content for the shell assistant tabs (reverse, bind, transfer)
    initShellAssistantContent()

    // init checklist assistant content
    initChecklistAssistantContent()

    // make all tables sortable
    initTableSortable()

    // search functionality for tables
    searchTable("search-postmessage-input", "postmessage-monitor-table")
    searchTable("search-cookie-monitor-input", "cookie-monitor-table")

    // manage the state of all accordions
    initAccordionPersistence();

    // init/build the persistDataMonitor
    initPersistDataMonitor();
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
 * Genereert een unieke dynamische ID string.
 * 
 * Deze functie creëert een willekeurige ID door het combineren van:
 * - Willekeurige getallen tussen 1 en 1.000.000
 * - Willekeurige alfanumerieke strings
 * 
 * De resulterende ID is zeer onwaarschijnlijk om te dupliceren,
 * wat het geschikt maakt voor gebruik als unieke identifier.
 * 
 * @returns {string} Een unieke dynamisch gegenereerde ID string
 */
function generateDynamicId() {
    return `${Math.floor((Math.random() * 999999) + 1)}${Math.random().toString(36)}${Math.floor((Math.random() * 999999) + 1)}${Math.random().toString(36)}${Math.floor((Math.random() * 999999) + 1)}`
}


/**
 * searchTable()
 *
 * Zoekt naar een specifieke waarde in een tabel. Het aantal kolommen of rijen maakt niet uit.
 *
 * Deze functie voegt een 'keyup' event listener toe aan het invoerveld met het opgegeven ID.
 * Wanneer de gebruiker tekst invoert, wordt de waarde vergeleken met de tekst in elke rij van de tabel.
 * Rijen die de ingevoerde waarde bevatten, worden weergegeven, terwijl andere rijen worden verborgen.
 *
 * @param {string} inputFieldId - Het ID van het invoerveld (zonder hashtag).
 * @param {string} tableId - Het ID van de tabel (zonder hashtag).
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
 * initTableSortable()
 *
 * adds the possibility to sort ascending or descending based on a table column
 */
function initTableSortable() {
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
    const maxLength = 150;

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
        linkToggle.textContent = ' ...see more';

        linkToggle.addEventListener('click', () => {
            if (spanFull.style.display === 'none') {
                spanFull.style.display = 'inline';
                spanShort.style.display = 'none';
                linkToggle.textContent = ' see less';
            } else {
                spanFull.style.display = 'none';
                spanShort.style.display = 'inline';
                linkToggle.textContent = ' ...see more';
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
        if (!cell.querySelector('.see-more')) {  // Check if "see more" has already been applied
            const cellText = cell.textContent.trim();
            if (cellText.length > maxLength) {
                const seeMoreElement = createSeeMoreElement(cellText);
                cell.innerHTML = ''; // Clear the cell content
                cell.appendChild(seeMoreElement);
            }
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
 * buildDisabledSelectOption()
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
    clone.classList.remove("p-2")
    clone.classList.add("p-0")

    // Apply styles to the clone to ensure all content is visible
    clone.style.position += 'fixed';
    clone.style.top += '0';
    clone.style.left += '0';
    clone.style.overflow += 'visible'; // Ensure no content is hidden
    clone.style.zIndex += '-9999'; // Make sure the clone doesn't interfere with the layout
    clone.style.whiteSpace = 'pre-wrap'; // Preserve whitespace and wrap long lines

    // Append the clone to the body (off-screen)
    document.body.appendChild(clone);

    // Use html2canvas to capture the clone
    html2canvas(clone, {
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

/**
 * copyElementContent()
 *
 * copy the content of an element, including the styles it has applied.
 *
 * @param text
 */
function copyElementContent(text) {
    try {
        navigator.clipboard.writeText(text);
        console.log('Content copied to clipboard');
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

/**
 * dispatchInputEvent()
 *
 *
 */
function dispatchInputEvent(element) {
    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
}

