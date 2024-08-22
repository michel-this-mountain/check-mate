class CodeElement{

    /**
     * constructor for setting up a code element
     *
     * @param idCode id of the code element
     * @param language language of the code (specified by highlight.js standards): language-bash, language-powershell, language-python etc.
     * @param code code to be displayed in the code area
     */
    constructor(idCode, language, code){
        this.p = createElement('pre', ["p-0", "w-100", "h-100"]);
        this.c = createElement('code', [language, "p-2", "rounded", "h-100"]);

        this.idCode = idCode
        this.imgSrc = 'assets/icons/general/copy.png'
        this.language = language;
        this.code = code;
    }

    /**
     * buildCodeElement()
     *
     * builds a code element and returns it
     */
    buildCodeElement(){
        let containerDiv = createElement("div", ["d-flex", "justify-content-between", "rounded", "border", "h-100"])

        this.c.innerText = this.code;
        this.c.id = this.idCode;
        this.c.style.cssText = "white-space: pre-wrap"

        this.p.appendChild(this.c);

        containerDiv.appendChild(this.p)
        containerDiv.appendChild(this.#buildCopyButton())
        this.#highlightCode();
        // return the pre element with the code element nested inside it
        return containerDiv
    }

    // highlight the code using highlight.js
    #highlightCode() {
        hljs.highlightElement(this.c);
    }

    #buildCopyButton(){
        let a = createElement("a", [])
        a.setAttribute("href", "#");

        let img = createElement("img", ["copy-icon-code", "m-1"]);
        img.src = this.imgSrc;
        img.style.cssText = 'position: absolute; bottom: 5px; right: 5px;height: 25px; width: 25px;';
        img.setAttribute("alt", "Copy");

        a.appendChild(img);
        return a
    }


}