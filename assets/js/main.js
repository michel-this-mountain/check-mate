// loaderElementIds = these are the IDS due to the time, the loader icon will appear on the left bottomside.
// totalScriptsProcessing = this variable keeps track on how many processes are running. If the value > 0, the loader icon will show, otherwise it does not show.
let loaderElementIds = ["enum-tooling-spider-start-button", "enum-tooling-extract-headers"]
let totalScriptsProcessing = 0;

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
        // check if the loader needs to be applied to the process
        loaderCheck(message.id, false);

        // enum-tooling (spider)
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

        // enum-tooling (toolbox)
        if (message.hasOwnProperty("toolboxJson")) {
            if (isValidJSON(message.toolboxJson)) {
                document.getElementById("enum-tooling-output-textarea").innerText = formatJSON(message.toolboxJson);
                document.getElementById("enum-tooling-output-textarea").value = formatJSON(message.toolboxJson);
            }
        }

        // enum-tooling (iframe checker)
        if (message.hasOwnProperty("enumToolingGetCurrentUrlIframe")) {
            // Relay the message back to the popup script
            document.getElementById("enum-tooling-iframe-url-input").innerText = message.enumToolingGetCurrentUrlIframe
            document.getElementById("enum-tooling-iframe-url-input").value = message.enumToolingGetCurrentUrlIframe
        }

        // enum-tooling (CSRF checker)
        if (message.hasOwnProperty("exploitAsssitantCSRFloadForms")) {
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

    });

    // ##### PERSIST DATA START ##### //
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

    // ##### PERSIST DATA END ##### //
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
                PD_mutation.target.tagName.toLowerCase() === 'button') {
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

    document.querySelectorAll('textarea, input[type="checkbox"], button').forEach(function (PD_element) {
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

    saveElementsToLocalStorage();
}

/**
 * parseFormsFromJson()
 *
 * Parse JSON string containing HTML forms and return them as HTML elements.
 * If the form's action attribute is a relative path, update it to the current domain/path.
 * @param {string} jsonString - The JSON string with form details.
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

