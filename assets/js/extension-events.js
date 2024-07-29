document.addEventListener("DOMContentLoaded", function () {
    // Function to activate a tab
    function activateTab(tabId) {
        const tabElement = document.querySelector(`a[href="${tabId}"]`);
        if (tabElement) {
            const tab = new bootstrap.Tab(tabElement);
            tab.show();
            tabElement.classList.add('active-link');
        }
    }

    // Retrieve and set the last active main tab from local storage
    const lastActiveMainTab = localStorage.getItem("lastActiveMainTab") === null ? "#tab1" : localStorage.getItem("lastActiveMainTab");

    if (lastActiveMainTab) {
        activateTab(lastActiveMainTab);
    }

    // Add event listener to all main nav links
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(navLink => {
        navLink.addEventListener('click', function (event) {
            event.preventDefault();

            // Remove active class from all links
            navLinks.forEach(link => {
                link.classList.remove('active-link');
                link.classList.remove('active');
            });

            // Save the active main tab to local storage
            const targetHref = event.target.closest('a').getAttribute("href");
            if (targetHref) {
                localStorage.setItem("lastActiveMainTab", targetHref);

                // Remove the active subtab when switching main tabs
                if (!targetHref.startsWith("#tab1")) {
                    localStorage.removeItem("general-tools-tab");
                }
                if (!targetHref.startsWith("#tab2")) {
                    localStorage.removeItem("enum-tooling-tab");
                }
                if (!targetHref.startsWith("#tab3")) {
                    localStorage.removeItem("exploit-assistant-tab");
                }
                if (!targetHref.startsWith("#tab4")) {
                    localStorage.removeItem("shell-assistant-tab");
                }
                if (!targetHref.startsWith("#tab5")) {
                    localStorage.removeItem("checklist-assistant-tab");
                }
                if (!targetHref.startsWith("#tab6")) {
                    localStorage.removeItem("useful-commands-tab");
                }
                if (!targetHref.startsWith("#tab7")) {
                    localStorage.removeItem("activeEnum7Tab");
                }
                if (!targetHref.startsWith("#tab8")) {
                    localStorage.removeItem("activeEnum8Tab");
                }

                // Show the selected tab using Bootstrap's tab API
                activateTab(targetHref);
            }
        });
    });

    // Apply the active-link class to the active tab link on page load
    if (lastActiveMainTab) {
        navLinks.forEach(link => link.classList.remove('active-link'));
        const activeLinkElement = document.querySelector(`a[href="${lastActiveMainTab}"]`);
        if (activeLinkElement) {
            activeLinkElement.classList.add('active-link');
            activeLinkElement.classList.add('active');
        }
    }

    // Nested tabs configuration
    const nestedTabsConfig = [
        {mainTab: "#tab1", nestedTabKey: "general-tools-tab", nestedTabSelector: "#toolsTab a"},
        {mainTab: "#tab2", nestedTabKey: "enum-tooling-tab", nestedTabSelector: "#enum-tooling-tab a"},
        {mainTab: "#tab3", nestedTabKey: "exploit-assistant-tab", nestedTabSelector: "#exploit-assistant-tab a"},
        {mainTab: "#tab4", nestedTabKey: "shell-assistant-tab", nestedTabSelector: "#shell-assistant-tab a"},
        {mainTab: "#tab5", nestedTabKey: "checklist-assistant-tab", nestedTabSelector: "#checklist-assistant-tab a"},
        {mainTab: "#tab6", nestedTabKey: "useful-commands-tab", nestedTabSelector: "#useful-commands-tab a"},
        {mainTab: "#tab7", nestedTabKey: "activeEnum7Tab", nestedTabSelector: "#enum7Tab a"},
        {mainTab: "#tab8", nestedTabKey: "activeEnum8Tab", nestedTabSelector: "#enum8Tab a"},
    ];

    nestedTabsConfig.forEach(config => {
        const nestedTabs = document.querySelectorAll(config.nestedTabSelector);
        nestedTabs.forEach(tab => {
            tab.addEventListener("click", function () {
                const href = this.getAttribute("href");
                if (href) {
                    localStorage.setItem(config.nestedTabKey, href);
                    localStorage.setItem("lastActiveMainTab", config.mainTab); // Ensure the main tab is also activated when a sub-tab is clicked
                }
            });
        });

        const activeNestedTab = localStorage.getItem(config.nestedTabKey);
        if (activeNestedTab) {
            activateTab(config.mainTab); // Ensure the parent tab is activated first
            activateTab(activeNestedTab);
        } else {
            // Default to the first nested tab if no active nested tab is stored
            const defaultNestedTabElement = document.querySelector(config.nestedTabSelector);
            if (defaultNestedTabElement) {
                activateTab(defaultNestedTabElement.getAttribute("href"));
            }
        }
    });

    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            delay: {"hide": 50}
        });
    });


    // add event listeners for the navbar
    replaceHover("tab-1-img", "assets/icons/navbar/", "tab-1-gen-tooling.png", "tab-1-gen-tooling-hover.png")
    replaceHover("tab-2-img", "assets/icons/navbar/", "tab-2-enum-tooling.png", "tab-2-enum-tooling-hover.png")
    replaceHover("tab-3-img", "assets/icons/navbar/", "tab-3-exploit-assistant.png", "tab-3-exploit-assistant-hover.png")
    replaceHover("tab-4-img", "assets/icons/navbar/", "tab-4-shell-assistant.png", "tab-4-shell-assistant-hover.png")
    replaceHover("tab-5-img", "assets/icons/navbar/", "tab-5-checklist-assistant.png", "tab-5-checklist-assistant-hover.png")
    replaceHover("tab-6-img", "assets/icons/navbar/", "tab-6-useful-commands.png", "tab-6-useful-commands-hover.png")

    // clipboard for copying text inside a textarea
    let activeCopyIcon = null;

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('copy-icon')) {
            if (activeCopyIcon) {
                activeCopyIcon.src = "/assets/icons/general/copy.png";
                activeCopyIcon.style.cssText = "position: absolute; bottom: 5px; right: 5px;";
            }

            let img = event.target;
            activeCopyIcon = img;

            img.style.cssText = "position: absolute; bottom: 5px; right: 5px; pointer-events: none;";

            // Find the closest parent with the class 'position-relative'
            let container = event.target.closest('.position-relative');
            if (container) {
                // Find the textarea within this container
                let textarea = container.querySelector('textarea');
                if (textarea) {
                    // Use the Clipboard API to copy the content
                    navigator.clipboard.writeText(textarea.value).then(function () {
                        console.log('[*] Text copied to clipboard');
                    }).catch(function (err) {
                        console.error('[*] Could not copy text: ', err);
                    });
                }
            }

            img.src = "/assets/icons/general/copy-success.png";
            setTimeout(function () {
                if (activeCopyIcon === img) {
                    img.src = "/assets/icons/general/copy.png";
                    img.style.cssText = "position: absolute; bottom: 5px; right: 5px;";
                    activeCopyIcon = null;
                }
            }, 2000);
        }
    });

    // add listeners for the refresh button class
    document.querySelectorAll(".refresh-control").forEach(element => {
        // Add event listener to each element
        element.addEventListener("click", function () {
            let controlRefreshState = element.getAttribute("data-control-refresh-active");

            if (controlRefreshState === "true") {
                let controlRefreshTbody = document.getElementById(element.value)
                controlRefreshTbody.setAttribute("id", `${element.value}-stopped`)
                element.classList.remove("btn-outline-danger")
                element.classList.add("btn-outline-primary")
                element.innerText = "Start refresh"
                element.setAttribute("data-control-refresh-active", "false");

            } else if (controlRefreshState === "false") {
                let controlRefreshTbody = document.getElementById(`${element.value}-stopped`)
                controlRefreshTbody.setAttribute("id", `${element.value}`)
                element.classList.remove("btn-outline-primary")
                element.classList.add("btn-outline-danger")
                element.innerText = "Stop refresh"
                element.setAttribute("data-control-refresh-active", "true");

            }
        });
    });
});

/**
 * replaceHover()
 *
 * @param elementId id of the element that should be replaced (img element)
 * @param prefix prefix for where to find the images
 * @param image image to use
 * @param replaceImage onhover image to use
 */
function replaceHover(elementId, prefix, image, replaceImage) {
    // add onmouseenter (hover image)
    document.getElementById(elementId).addEventListener("mouseenter", function () {
        document.getElementById(elementId).src = `${prefix}${replaceImage}`
    })

    // add onmouseleave (standard image)
    document.getElementById(elementId).addEventListener("mouseleave", function () {
        document.getElementById(elementId).src = `${prefix}${image}`
    })
}