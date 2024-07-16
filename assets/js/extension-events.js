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
        { mainTab: "#tab1", nestedTabKey: "activeToolsTab", nestedTabSelector: "#toolsTab a" },
        { mainTab: "#tab2", nestedTabKey: "activeEnum2Tab", nestedTabSelector: "#enum2Tab a" },
        { mainTab: "#tab3", nestedTabKey: "activeEnum3Tab", nestedTabSelector: "#enum3Tab a" },
        { mainTab: "#tab4", nestedTabKey: "activeEnum4Tab", nestedTabSelector: "#enum4Tab a" },
        { mainTab: "#tab5", nestedTabKey: "activeEnum5Tab", nestedTabSelector: "#enum5Tab a" },
        { mainTab: "#tab6", nestedTabKey: "activeEnum6Tab", nestedTabSelector: "#enum6Tab a" },
        { mainTab: "#tab7", nestedTabKey: "activeEnum7Tab", nestedTabSelector: "#enum7Tab a" },
        { mainTab: "#tab8", nestedTabKey: "activeEnum8Tab", nestedTabSelector: "#enum8Tab a" },
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

    // add event listeners for tooling

});

/**
 * replaceHover()
 *
 * used in combination with onmouseout
 * @param elementId
 * @param replaceImage
 */
function replaceHover(elementId, replaceImage){
    document.getElementById(elementId).src = replaceImage
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