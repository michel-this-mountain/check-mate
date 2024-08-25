class Modal {
    constructor(modalId, imgSrc, imgSrcHover, width, height, hoverText) {
        this.modalId = modalId;
        this.imgSrc = imgSrc;
        this.imgSrcHover = imgSrcHover;
        this.width = width;
        this.height = height;
        this.hoverText = hoverText;
    }

    /**
     * buildModalButton()
     *
     * build a modal using bootstrap modal structure
     */
    #buildModalButton(){
        let a = createElement("a", [])
        a.setAttribute("href", `#${this.modalId}`)
        a.setAttribute("data-bs-target", `#${this.modalId}`)
        a.setAttribute("data-bs-toggle", "modal")

        let img = createElement("img", ["ms-2"])
        img.setAttribute("src", this.imgSrc)
        img.style.cssText = `width: ${this.width}px !important; height: ${this.height}px !important;`

        if (this.hoverText) {
            img.setAttribute("data-bs-toggle", "tooltip")
            img.setAttribute("data-bs-placement", "right")
            img.setAttribute("title", this.hoverText)
        }

        a.appendChild(img)

        return a;
    }

    /**
     * buildModal()
     *
     * build a modal using bootstrap modal structure
     */
    buildModal(modalBodyContent) {
        let divContainer = createElement("div", ["modal", "fade"])
        let modalDialog = createElement("div", ["modal-dialog", "modal-dialog-centered", "w-75"])
        let modalContent = createElement("div", ["modal-content"])
        let modalHeader = createElement("div", ["modal-header"])
        let modalBody = createElement("div", ["modal-body", "p-1"])
        let headerText = createElement("h5", ["modal-title"])
        let modalCloseBtn = createElement("button", ["btn-close"])

        divContainer.setAttribute("id", this.modalId)
        divContainer.setAttribute("tabindex", "-1")
        divContainer.setAttribute("aria-labelledby", `${this.modalId}-label`)
        divContainer.setAttribute("aria-hidden", "true")

        headerText.setAttribute("id", `${this.modalId}-label`)
        headerText.innerText = this.hoverText

        modalCloseBtn.setAttribute("type", "button")
        modalCloseBtn.setAttribute("data-bs-dismiss", "modal")
        modalCloseBtn.setAttribute("aria-label", "Close")

        modalBody.appendChild(modalBodyContent)
        modalHeader.appendChild(headerText)
        modalHeader.appendChild(modalCloseBtn)

        modalContent.appendChild(modalHeader)
        modalContent.appendChild(modalBody)

        modalDialog.appendChild(modalContent)
        divContainer.appendChild(modalDialog)

        document.getElementById("modal-container").appendChild(divContainer)
        return this.#buildModalButton()
    }
}