class CheckList {
    constructor(jsonChecklist, containerId) {
        this.jsonChecklist = jsonChecklist;
        this.containerId = containerId;
    }

    /**
     * buildChecklist()
     *
     * build an entire checklist using an bootstrap accordion structure
     */
    buildChecklist() {
        let containerElement = document.getElementById(this.containerId)
        containerElement.classList.add("accordion");

        // loop through the checklist for the number of chapters
        for (let i = 0; i < this.jsonChecklist.length; i++) {
            const chapter = this.jsonChecklist[i].chapter;
            const hashedChapter = Hashing.hashMD5(chapter);

            // accordion item is build here
            let checklistChapter = this.#buildChecklistChapter(hashedChapter, chapter)
            let checklistContent = this.#buildChecklistContent(hashedChapter, chapter, this.jsonChecklist[i].checks)

            // append the accordion item to the accordion container
            containerElement.appendChild(checklistChapter);
            containerElement.appendChild(checklistContent);
        }

        return containerElement
    }

    #buildChecklistChapter(hashedChapter, chapter) {
        // accordion item container
        let accordionItem = createElement("div", ["accordion-item", "border"]);

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


    #buildChecklistContent(hashedChapter, chapter, checks) {
        let accordionCollapse = createElement("div", ["accordion-collapse", "collapse"]);
        accordionCollapse.setAttribute("id", `collapse-${hashedChapter}`);
        accordionCollapse.setAttribute("aria-labelledby", `heading-${hashedChapter}`);
        accordionCollapse.setAttribute("data-bs-parent", `#${this.containerId}`);

        let accordionBody = createElement("div", ["accordion-body"]);
        let accordionContentElement = createElement("ul", ["w-100", "m-0", "p-0"])

        for (let i = 0; i < checks.length; i++) {
            accordionContentElement.appendChild(this.#buildCheckElement(checks[i], accordionContentElement, hashedChapter, i + 1));
        }

        accordionBody.appendChild(accordionContentElement);
        accordionCollapse.appendChild(accordionBody);

        return accordionCollapse
    }

    #buildCheckElement(check, accordionContentElement, hashedChapter, index) {
        // create a new list item
        let listItem = createElement("li", ["list-group-item", "p-2", "w-100"]);
        listItem.style.cssText = "overflow-x: scroll;"

        let codeElement = new CodeElement(`check-code-element-${hashedChapter}-${index}`, check.code_language, check.code).buildCodeElement();
        let checkBox = new CheckBox(`check-checkbox-${hashedChapter}-${index}`, `${index}) ${check.title}`, check.description).buildCheckBox();
        let modal = new Modal(`check-modal-${hashedChapter}-${index}`, 'assets/icons/navbar/tab-5-checklist-assistant/general/code.png', 25, 25, 'Associated code').buildModal(codeElement);

        let divContainer = createElement("div", ["d-flex", "justify-content-between"])
        divContainer.appendChild(checkBox)
        divContainer.appendChild(modal)

        listItem.appendChild(divContainer);
        listItem.appendChild(new TextArea(`check-textarea-${hashedChapter}-${index}`,  check.rows).buildTextArea());


        // append the list item to the accordion content element
        return listItem
    }

    #buildCheckElementCodeModal(check) {

    }
}