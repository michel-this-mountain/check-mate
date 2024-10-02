
// add all event listeners for the tab-1-tooling
document.addEventListener("DOMContentLoaded", function () {
    // Encoding tab
    const encodingSelect = document.getElementById("encoding-select-technique");
    const encodingInput = document.getElementById("encoding-decoding-input-textarea");
    const encodingOutput = document.getElementById("encoding-decoding-output-textarea");

    const updateEncodingOutput = () => {
        const result = decideEncodingOrDecoding(encodingSelect.value, encodingInput.value);
        encodingOutput.innerText = result;
        encodingOutput.value = result;
    };

    encodingSelect.addEventListener("change", updateEncodingOutput);
    encodingInput.addEventListener("input", updateEncodingOutput);

    // Hashing tab
    const hashSelect = document.getElementById("hash-select-algorithm");
    const hashGenInput = document.getElementById("hash-generate-input");
    const hashGenOutput = document.getElementById("hash-generate-output");
    const hashIdentifyInput = document.getElementById("hash-identify-input");
    const hashIdentifyOutput = document.getElementById("hash-identify-output");

    const updateHashGenOutput = () => {
        const result = decideHashingAlgorithm(hashSelect.value, hashGenInput.value);
        hashGenOutput.innerText = result;
        hashGenOutput.value = result;
    };

    hashSelect.addEventListener("change", updateHashGenOutput);
    hashGenInput.addEventListener("input", updateHashGenOutput);

    hashIdentifyInput.addEventListener("input", () => {
        const result = Hashing.identifyHash(hashIdentifyInput.value);
        hashIdentifyOutput.innerText = result;
        hashIdentifyOutput.value = result;
    });

    // Formatter tab
    const formatJsonButton = document.getElementById("input-format-json-button");
    const formatJsonTextarea = document.getElementById("input-json-text");

    formatJsonTextarea.addEventListener("input", () => {
        formatJsonTextarea.value = formatJsonTextarea.value.replaceAll("'", "\"");
        if (isValidJSON(formatJsonTextarea.value)) {
            formatJsonTextarea.classList.add("is-valid");
            formatJsonTextarea.classList.remove("is-invalid");
        } else {
            formatJsonTextarea.classList.remove("is-valid");
            formatJsonTextarea.classList.add("is-invalid");
        }
    });

    formatJsonButton.addEventListener("click", () => {
        formatJsonTextarea.value = formatJSON(formatJsonTextarea.value.replaceAll("'", "\""), 4);
    });

    // Code Highlight
    const codeHighlightSelect = document.getElementById("general-tooling-code-highlighter-options");
    const codeHighlightInput = document.getElementById("general-tooling-code-highlighter-input");
    const codeHighlightOutput = document.getElementById("general-tooling-code-highlighter-output-pre");
    const screenshotElement = document.getElementById("general-tooling-code-highlighting-screenshot");

    const updateCodeHighlight = () => {
        updateCodeElement(codeHighlightOutput.querySelector("code"), codeHighlightInput.value, codeHighlightSelect);
    };

    codeHighlightInput.addEventListener("input", updateCodeHighlight);
    codeHighlightSelect.addEventListener("change", updateCodeHighlight);

    screenshotElement.addEventListener("click", () => {
        captureAndCopyCodeElementToClipboard(codeHighlightOutput.querySelector("code"), codeHighlightSelect.value);
        screenshotElement.src = "assets/icons/general/screenshot-success.png";
        screenshotElement.closest("a").classList.add("inactive-link");

        setTimeout(() => {
            screenshotElement.src = "assets/icons/general/screenshot.png";
            screenshotElement.closest("a").classList.remove("inactive-link");
        }, 2000);
    });

    updateCodeHighlight();

    // code obfuscation
    // const codeObfuscationSelect = document.getElementById("general-tooling-code-obfuscation-options");
    // const codeObfuscationInput = document.getElementById("general-tooling-code-obfuscation-input");
    // const codeObfuscationOutput = document.getElementById("general-tooling-code-obfuscation-output-pre");
    // const screenshotElementObfuscation = document.getElementById("general-tooling-code-obfuscation-screenshot");

    // const updateCodeObfuscation = () => {
    //     updateCodeElement(codeObfuscationOutput.querySelector("code"),JavaScriptObfuscator.obfuscate(`${codeObfuscationInput.value}`).getObfuscatedCode(), codeObfuscationSelect);
    // };

    // codeObfuscationInput.addEventListener("input", updateCodeObfuscation);
    // codeObfuscationSelect.addEventListener("change", updateCodeObfuscation);

    // screenshotElementObfuscation.addEventListener("click", () => {
    //     captureAndCopyCodeElementToClipboard(codeObfuscationOutput.querySelector("code"), codeObfuscationSelect.value);
    //     screenshotElementObfuscation.src = "assets/icons/general/screenshot-success.png";
    //     screenshotElementObfuscation.closest("a").classList.add("inactive-link");

    //     setTimeout(() => {
    //         screenshotElementObfuscation.src = "assets/icons/general/screenshot.png";
    //         screenshotElementObfuscation.closest("a").classList.remove("inactive-link");
    //     }, 2000);
    // });

    // updateCodeObfuscation();
    // setTimeout(() => {
    //     console.log(JavaScriptObfuscator.obfuscate(`console.log(1);window.alert(2);`).getObfuscatedCode());
    // }, 5000);

});

/**
 * updateCodeElement()
 *
 * update the old code element with the new code element
 *
 * @param oldCodeElement
 * @param codeHighlightInput
 * @param codeHighlightSelectMenu
 */
function updateCodeElement(oldCodeElement, codeHighlightInputValue, codeHighlightSelectMenu) {
    if (oldCodeElement) {
        oldCodeElement.textContent = codeHighlightInputValue
        let newCodeElement = buildCodeElement(oldCodeElement, codeHighlightSelectMenu.value)
        oldCodeElement.parentNode.replaceChild(newCodeElement, oldCodeElement)
    }
}

/**
 * buildCodeElement()
 *
 * build a new code element with the given language
 * @param oldCodeElement
 * @param language
 * @returns {HTMLElement}
 */
function buildCodeElement(oldCodeElement, language) {
    const codeElement = document.createElement("code");
    codeElement.className = `rounded ${language} p-2`;
    codeElement.textContent = oldCodeElement.innerText;
    hljs.highlightElement(codeElement);

    return codeElement;
}

// FORMATTER TAB START

// method that verifies if the input JSON is valid
function isValidJSON(jsonString) {
    try {
        JSON.parse(jsonString);
        return true;
    } catch (e) {
        return false;
    }
}

// method that formats a json object
function formatJSON(jsonString, depth = 4) {

    if (!isValidJSON(jsonString)) {
        throw new Error('Invalid JSON string');
    }
    const jsonObject = JSON.parse(jsonString);
    return JSON.stringify(jsonObject, null, depth);
}

/**
 * decideHashingAlgorithm()
 *
 * decides based off the input what hashing algorithm it should use
 *
 * @param algorithm algorithm to use
 * @param text text to hash
 * @returns {*|string} returns a hashed string
 */
function decideHashingAlgorithm(algorithm, text) {
    switch (algorithm) {
        case "md5":
            return Hashing.hashMD5(text);
        case "bcrypt":
            return Hashing.hashBcrypt(text);
        case "sha1":
            return Hashing.hashSHA1(text);
        case "sha224":
            return Hashing.hashSHA224(text);
        case "sha256":
            return Hashing.hashSHA256(text);
        case "sha384":
            return Hashing.hashSHA384(text);
        case "sha512":
            return Hashing.hashSHA512(text);
    }
}

/**
 * decideEncodingOrDecoding()
 *
 * decides based off the technique what encoding or decoding technique it should use, and it returns the
 *
 * @param technique
 * @param text
 * @returns {*|string}
 */
function decideEncodingOrDecoding(technique, text) {
    switch (technique) {
        case "b64-e":
            return EncoderDecoder.encodeBase64(text);
        case "b64-d":
            return EncoderDecoder.decodeBase64(text);
        case "uri-e":
            return EncoderDecoder.encodeURI(text);
        case "uri-d":
            return EncoderDecoder.decodeURI(text);
        case "decimal-e":
            return EncoderDecoder.encodeDecimal(text);
        case "decimal-d":
            return EncoderDecoder.decodeDecimal(text);
        case "hex-e":
            return EncoderDecoder.encodeHex(text);
        case "hex-d":
            return EncoderDecoder.decodeHex(text);
        case "html-e":
            return EncoderDecoder.encodeHTML(text);
        case "html-d":
            return EncoderDecoder.decodeHTML(text);
        case "unicode-e":
            return EncoderDecoder.encodeUnicode(text);
        case "unicode-d":
            return EncoderDecoder.decodeUnicode(text);
        case "hexjs-e":
            return EncoderDecoder.encodeHexJS(text);
        case "hexjs-d":
            return EncoderDecoder.decodeHexJS(text);
    }
}