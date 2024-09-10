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

    buildStabilizeShellModal()
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

    // at startup, highlight the code
    setTimeout(replaceAndBuildCodeElement, 100)

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
 * buildStabilizeShellModal()
 *
 * Method that builds the modal with info of how to stabilize your tty shell
 */
function buildStabilizeShellModal() {
    const elements = document.querySelectorAll(".shell-assistant-stabilize-shell-modal");

    elements.forEach(element => {
        let codeElement = new CodeElement('shell-assistant-stabilize-shell-code', "language-bash", `# step 1 (victim tty)
python3 -c 'import pty;pty.spawn("/bin/bash")'

# step 2 (victim tty)
export TERM=xterm

# step 3 (victim tty)
ctrl + z

# step 4 (your own tty)
stty raw -echo; fg

# step 5 (victim tty)
stty rows 38 columns 116

`).buildCodeElement();
        let modalButton = new Modal('shell-assistant-stabilize-shell-modal', 'assets/icons/navbar/tab-4-shell-assistant/stabilize-shell.png', 'assets/icons/navbar/tab-4-shell-assistant/stabilize-shell-hover.png', '20', '20', 'Fully interactive TTY').buildModal(codeElement);
        element.appendChild(modalButton);
    });

}