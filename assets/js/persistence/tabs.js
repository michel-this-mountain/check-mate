/**
 * tabPersistence()
 *
 * This function is responsible for maintaining the active tab state across pages.
 * Once a tab or subtab has been clicked, it should hold track of where the user is, using local storage, on restart of the plugin
 */
function initTabPersistence() {
    // ## Retrieve and set the last active main tab from local storage START ## //
    function activateTab(tabId) {
        const tabElement = document.querySelector(`a[href="${tabId}"]`);
        if (tabElement) {
            const tab = new bootstrap.Tab(tabElement);
            tab.show();
            tabElement.classList.add('active-link');
        }
    }

    const lastActiveMainTab = localStorage.getItem("lastActiveMainTab") === null ? "#tab1" : localStorage.getItem("lastActiveMainTab");
    if (lastActiveMainTab) {
        activateTab(lastActiveMainTab);
    }
    // ## Retrieve and set the last active main tab from local storage END ## //

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
}