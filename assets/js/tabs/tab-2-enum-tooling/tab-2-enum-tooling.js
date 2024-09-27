document.addEventListener("DOMContentLoaded", function () {
    // SPIDER tab
    const spiderSimplifiedButton = document.getElementById("enum-tooling-spider-simplified-view");
    const spiderDetailedButton = document.getElementById("enum-tooling-spider-detailed-view");
    const spiderOutputArea = document.getElementById("enum-tooling-spider-output-textarea");

    spiderSimplifiedButton.addEventListener("click", () => {
        spiderOutputArea.value = spiderSimplifiedButton.value;
    });

    spiderDetailedButton.addEventListener("click", () => {
        spiderOutputArea.value = spiderDetailedButton.value;
    });

    // IFRAME CHECKER tab
    const checkIframeButton = document.getElementById("enum-tooling-iframe-check-iframe-button");
    const iframeInputUrl = document.getElementById("enum-tooling-iframe-url-input");
    const iframeElement = document.getElementById("enum-tooling-iframe-check-iframe-element");

    checkIframeButton.addEventListener("click", () => {
        iframeElement.src = iframeInputUrl.value;
    });

    buildGoogleDorkExplanationModal();
    googleDorkQueryBuilder();
});

/**
 * buildGoogleDorkExplanationModal()
 * 
 * build a modal with a list of google dorks and their explanations
 */
function buildGoogleDorkExplanationModal(){
    const elements = document.querySelectorAll(".enum-tooling-google-dork-explanation");

    elements.forEach(element => {
        let codeElement = new CodeElement('enum-tooling-google-dork-explanation-code', "language-bash", `# Google Dork Parameters Explanation

# 1. inurl: - Searches for a specified term within the URL of a page
# Finds pages with "login" in the URL
inurl:login

# 2. intitle: - Searches for pages with specified terms in the title
# Finds directory listings
intitle:"index of"

# 3. filetype: - Searches for specific file types
# Finds PDF files containing "confidential"
filetype:pdf "confidential"

# 4. ext: - Similar to filetype, searches for specific file extensions
# Finds PHP files
ext:php

# 5. link: - Finds pages that link to a specified URL
# Finds pages linking to example.com
link:example.com

# 6. cache: - Shows Google's cached version of a specific page
# Shows Google's cached version of the NY Times homepage
cache:nytimes.com

# 7. allintext: - Searches for pages containing all the specified 
# terms in the text
# Finds pages with both "username" and "password"
allintext: username password

# 8. allinurl: - Finds pages with all the specified terms in the URL
# Finds .gov URLs containing both "gov" and "research"
allinurl:gov research

# 9. related: - Finds pages that are related to a specified URL
# Finds sites similar to GitHub
related:github.com

# 10. "specific phrase" - Surrounding a phrase with quotes searches for an exact match
# Finds pages with the exact phrase "GitHub"
"GitHub"
`).buildCodeElement();
        let modalButton = new Modal('enum-tooling-google-dork-explanation', 'assets/icons/navbar/tab-2-enum-tooling/subtab-4-google-dork/google-dork-modal.png', 'assets/icons/navbar/tab-2-enum-tooling/subtab-4-google-dork/google-dork-modal-hover.png', '22', '22', 'Google Dork queries & explanations').buildModal(codeElement);
        element.appendChild(modalButton);
    });
}

/**
 * googleDorkQueryBuilder()
 * 
 * function to build a google dork query from the input fields
 */
function googleDorkQueryBuilder(){
    document.getElementById("enum-tooling-google-dork-build-query-button").addEventListener("click", function() {
        const domainInput = document.getElementById("enum-tooling-google-dork-domain-input");
        const parametersSelect = document.getElementById("enum-tooling-google-dork-select-parameters");
        const queryOutput = document.getElementById("enum-tooling-google-dork-output-textarea");

        queryOutput.value = `site:${domainInput.value}`;

        for (let i = 0; i < parametersSelect.value.length; i++) {
            switch (parametersSelect.value[i]) {
                case "inurl":
                    queryOutput.value += ` inurl:${prompt("Enter the inurl parameter:")}`;
                    break;
                case "intitle":
                    queryOutput.value += ` intitle:${prompt("Enter the intitle parameter:")}`;
                    break;
                case "filetype":
                    queryOutput.value += ` filetype:${prompt("Enter the filetype parameter:")}`;
                    break;
                case "ext":
                    queryOutput.value += ` ext:${prompt("Enter the ext parameter:")}`;
                    break;
                case "link":
                    queryOutput.value += ` link:${prompt("Enter the link parameter:")}`;
                    break;
                case "cache":
                    queryOutput.value += ` cache:${prompt("Enter the cache parameter:")}`;
                    break;
                case "allintext":
                    queryOutput.value += ` allintext:${prompt("Enter the allintext parameter:")}`;
                    break;
                case "allinurl":
                    queryOutput.value += ` allinurl:${prompt("Enter the allinurl parameter:")}`;
                    break;
                case "related":
                    queryOutput.value += ` related:${prompt("Enter the related parameter:")}`;
                    break;
                case "specific phrase":
                    queryOutput.value += ` "${prompt("Enter the specific phrase parameter:")}"`;
                    break;
                default:
                    break;
            }
        }
        queryOutput.value = queryOutput.value.trim();   
    });
}