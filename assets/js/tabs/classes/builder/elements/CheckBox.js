class CheckBox {
    constructor(id, labelText) {
        this.id = id;
        this.labelText = labelText;
        this.divCheck = createElement('div', ["form-group", "form-check"]);
        this.check = createElement('input', ["form-check-input"]);
        this.label = createElement('label', ["form-check-label"]);
    }

    buildCheckBox(){
        this.check.type = "checkbox";
        this.check.id = this.id;

        this.label.htmlFor = this.id;
        this.label.innerText = this.labelText;

        this.divCheck.appendChild(this.check);
        this.divCheck.appendChild(this.label);

        return this.divCheck;
    }
}