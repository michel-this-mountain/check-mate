const checklist = {
    windows: {
        checklist_privesc: [{
            chapter: "1. Enumeration",
            checks: [
                {
                    title: "System enumeration: systeminfo",
                    description: "Execute the command: '<code>systeminfo</code>'. What is the architecture (x86/x64), the OS name and OS version?",
                    notes: "",
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "System enumeration: wmic qfe",
                    description: "Execute the command: '<code>wmic qfe</code>' (if possible). What is the latest hotfixID?",
                    code: "wmic qfe",
                    notes: "",
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
            ]
        }]
    }
}

/**
 * buildTextArea()
 *
 * build a textarea with a copy button
 *
 * @param rows = the number of rows
 * @param id = the id of the textarea
 * @returns {string} html of a textarea with copy button
 */
// function buildTextArea(id, rows) {
//     let textarea = `
//         <div class="form-group">
//             <!-- start textarea and copybutton-->
//             <div class="position-relative d-flex">
//                 <textarea
//                         class="form-control"
//                         rows="${rows}"
//                         id="${id}"
//                         style="width: 100%; padding-right: 40px;"></textarea>
//                 <a href="#">
//                     <img class="copy-icon"
//                          src="assets/icons/general/copy.png"
//                          style="position: absolute; bottom: 5px; right: 5px;"
//                          height="25px"
//                          width="25px"
//                          alt="Copy">
//                 </a>
//             </div>
//         </div>`;
//
//
//     return textarea;
// }
//
/**
 * buildCheckbox()
 *
 * build a checkbox with a title
 *
 * @param id id of the checkbox
 * @param title title that is part of the checkbox
 * @param index index of the checkbox
 * @returns {string}
 */
function buildCheckbox(index, id) {
    let checkbox = `
        <div>

            <div class="d-flex justify-content-left">
                <span>${index})&nbsp;</span>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="${id}">
                </div>
            </div>
        </div>`;

    return checkbox;
}

/**
 * initChecklistAssistantContent()
 *
 * initiates all the checklists
 */
function initChecklistAssistantContent() {
    buildChecklistWithChapters(checklist.windows.checklist_privesc, document.getElementById('checklist-assistant-windows-privesc-accordion'));
}

/**
 * buildChecklistWithChapters()
 *
 * build a checklist with chapters
 * @param checklist
 * @param appendElement
 */
function buildChecklistWithChapters(checklist, appendElement) {
    // retrieve the accordionId
    let accordionContainerId = appendElement.getAttribute("id");
    appendElement.classList.add("accordion");

    // loop through the checklist for the number of chapters
    for (let i = 0; i < checklist.length; i++) {
        const chapter = checklist[i].chapter;
        const hashedChapter = Hashing.hashMD5(chapter);

        // accordion item is build here
        let accordionItem = buildAccordionItem(hashedChapter, chapter)
        let accordionContent = buildAccordionContent(hashedChapter, chapter, accordionContainerId, checklist[i].checks)

        // append the accordion item to the accordion container
        appendElement.appendChild(accordionItem);
        appendElement.appendChild(accordionContent);
    }
}

/**
 * buildAccordionContentElement()
 *
 * build the accordion content element, which contains a checkbox, the description and additional functionality
 * @param check
 * @param accordionContentElement
 * @param hashedChapter
 * @param index
 * @returns {*}
 */
function buildAccordionContentElement(check, accordionContentElement, hashedChapter, index) {
    // create a new list item
    let listItem = createElement("li", ["list-group-item"]);
    listItem.innerHTML = buildCheckbox(check.title, `check-${hashedChapter}-${index}`);

    // append the list item to the accordion content element
    accordionContentElement.appendChild(listItem)

    // return the accordion content element
    return accordionContentElement;
}

/**
 * buildAccordionContent()
 *
 * build the content of the accordion
 * @param hashedChapter
 * @param chapter
 * @param containerId
 * @param checks
 * @returns {HTMLElement}
 */
function buildAccordionContent(hashedChapter, chapter, containerId, checks) {
    let accordionCollapse = createElement("div", ["accordion-collapse", "collapse"]);
    accordionCollapse.setAttribute("id", `collapse-${hashedChapter}`);
    accordionCollapse.setAttribute("aria-labelledby", `heading-${hashedChapter}`);
    accordionCollapse.setAttribute("data-bs-parent", `#${containerId}`);

    let accordionBody = createElement("div", ["accordion-body"]);
    let accordionContentElement = createElement("ul", [])

    for (let i = 0; i < checks.length; i++) {
        accordionContentElement = buildAccordionContentElement(checks[i], accordionContentElement, hashedChapter, i+1);
    }

    accordionBody.appendChild(accordionContentElement);
    accordionCollapse.appendChild(accordionBody);

    return accordionCollapse
}


/**
 * build a clickable accordion item
 *
 * @param hashedChapter
 * @param chapter
 * @returns {HTMLElement}
 */
function buildAccordionItem(hashedChapter, chapter) {
    // accordion item container
    let accordionItem = createElement("div", ["accordion-item"]);

    // header if tge accordion item
    let accordionHeader = createElement("h2", ["accordion-header"]);
    accordionHeader.setAttribute("id", `heading-${hashedChapter}`);

    // button to click on
    let accordionButton = createElement("button", ["accordion-button", "collapsed"]);
    accordionButton.setAttribute("type", "button");
    accordionButton.setAttribute("data-bs-toggle", "collapse");
    accordionButton.setAttribute("data-bs-target", `#collapse-${hashedChapter}`);
    accordionButton.setAttribute("aria-expanded", "false");
    accordionButton.setAttribute("aria-controls", `collapse-${hashedChapter}`);
    accordionButton.innerText = chapter;

    // append the button to the header
    accordionHeader.appendChild(accordionButton);
    accordionItem.appendChild(accordionHeader);

    // return the accordion header
    return accordionItem
}


