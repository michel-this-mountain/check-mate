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
    const lastActiveMainTab = localStorage.getItem("lastActiveMainTab");
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
                    localStorage.removeItem("activeToolsTab");
                }
                if (!targetHref.startsWith("#tab2")) {
                    localStorage.removeItem("activeEnum2Tab");
                }
                if (!targetHref.startsWith("#tab3")) {
                    localStorage.removeItem("activeEnum3Tab");
                }
                if (!targetHref.startsWith("#tab4")) {
                    localStorage.removeItem("activeEnum4Tab");
                }
                if (!targetHref.startsWith("#tab5")) {
                    localStorage.removeItem("activeEnum5Tab");
                }
                if (!targetHref.startsWith("#tab6")) {
                    localStorage.removeItem("activeEnum6Tab");
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
        {mainTab: "#tab1", nestedTabKey: "activeToolsTab", nestedTabSelector: "#toolsTab a"},
        {mainTab: "#tab2", nestedTabKey: "activeEnum2Tab", nestedTabSelector: "#enum2Tab a"},
        {mainTab: "#tab3", nestedTabKey: "activeEnum3Tab", nestedTabSelector: "#enum3Tab a"},
        {mainTab: "#tab4", nestedTabKey: "activeEnum4Tab", nestedTabSelector: "#enum4Tab a"},
        {mainTab: "#tab5", nestedTabKey: "activeEnum5Tab", nestedTabSelector: "#enum5Tab a"},
        {mainTab: "#tab6", nestedTabKey: "activeEnum6Tab", nestedTabSelector: "#enum6Tab a"},
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

    // tooltip
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })

    // add event listeners for the navbar
    replaceHover("tab-1-img", "assets/icons/navbar/", "tools-tab-1.png", "tools-tab-1-hover.png")
    replaceHover("tab-2-img", "assets/icons/navbar/", "recon-tools-tab-2.png", "recon-tools-tab-2-hover.png")
    replaceHover("tab-3-img", "assets/icons/navbar/", "exploit-assistant-tab-3.png", "exploit-assistant-tab-3-hover.png")
    replaceHover("tab-4-img", "assets/icons/navbar/", "shell-assistant-tab-4.png", "shell-assistant-tab-4-hover.png")
    replaceHover("tab-5-img", "assets/icons/navbar/", "checklist-assistant-tab-5.png", "checklist-assistant-tab-5-hover.png")
    replaceHover("tab-6-img", "assets/icons/navbar/", "usefull-commands-tab-6.png", "usefull-commands-tab-6-hover.png")

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


    //
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


// Encode and Decode functionality with oninput
document.getElementById("encodeInput").addEventListener("input", function () {
    const input = document.getElementById("encodeInput").value;
    const output = btoa(input);
    document.getElementById("encodeOutput").innerText = output;
});

document.getElementById("decodeInput").addEventListener("input", function () {
    const input = document.getElementById("decodeInput").value;
    try {
        const output = atob(input);
        document.getElementById("decodeOutput").innerText = output;
    } catch (e) {
        document.getElementById("decodeOutput").innerText = "Invalid Base64 input";
    }
});