function initTabPersistence() {
    // Initialize the tab persistence logic
    setupMainTabPersistence();
    setupNestedTabsPersistence();
}

/**
 * Activates a Bootstrap tab by its href attribute and adds an active class to the link.
 * @param {string} tabId - The href of the tab to activate.
 */
function activateTab(tabId) {
    const tabElement = document.querySelector(`a[href="${tabId}"]`);
    if (tabElement) {
        const tab = new bootstrap.Tab(tabElement);
        tab.show(); // Show the tab using Bootstrap's API
        tabElement.classList.add('active-link'); // Add a class to highlight the active tab
    }
}

/**
 * Set up the persistence logic for main tabs (first-level navigation).
 * This saves and restores the last active main tab.
 */
function setupMainTabPersistence() {
    const lastActiveMainTab = localStorage.getItem("lastActiveMainTab") || "#tab1";

    // Activate the last active main tab on page load
    activateTab(lastActiveMainTab);

    // Add event listener to all main navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(navLink => {
        navLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior

            // Remove active class from all main navigation links
            navLinks.forEach(link => {
                link.classList.remove('active-link');
                link.classList.remove('active');
            });

            // Save the active main tab to local storage
            const targetHref = event.target.closest('a').getAttribute("href");
            if (targetHref) {
                localStorage.setItem("lastActiveMainTab", targetHref);

                // Clear any stored nested or third-level tabs when switching main tabs
                clearNestedAndThirdLayerTabs(targetHref);

                // Activate the selected main tab
                activateTab(targetHref);
            }
        });
    });

    // Apply the active class to the active tab link on page load
    if (lastActiveMainTab) {
        navLinks.forEach(link => link.classList.remove('active-link'));
        const activeLinkElement = document.querySelector(`a[href="${lastActiveMainTab}"]`);
        if (activeLinkElement) {
            activeLinkElement.classList.add('active-link');
            activeLinkElement.classList.add('active');
        }
    }
}

/**
 * Clears stored nested and third-level tab states when switching main tabs.
 * @param {string} targetHref - The href of the currently active main tab.
 */
function clearNestedAndThirdLayerTabs(targetHref) {
    nestedTabsConfig.forEach(config => {
        if (!targetHref.startsWith(config.mainTab)) {
            localStorage.removeItem(config.nestedTabKey);
            localStorage.removeItem(config.thirdLayerKey);
        }
    });
}

/**
 * Set up the persistence logic for nested tabs (second-level navigation) and third-level navigation.
 * This saves and restores the last active nested and third-level tabs.
 */
function setupNestedTabsPersistence() {
    nestedTabsConfig.forEach(config => {
        setupNestedTabEventListeners(config);
        restoreNestedAndThirdLayerTabs(config);
    });
}

/**
 * Adds event listeners to nested tabs (second-level) and third-level navigation items.
 * @param {Object} config - The configuration object for the nested tab.
 */
function setupNestedTabEventListeners(config) {
    const nestedTabs = document.querySelectorAll(config.nestedTabSelector);
    nestedTabs.forEach(tab => {
        tab.addEventListener("click", function () {
            const href = this.getAttribute("href");
            if (href) {
                // Save the active nested tab and ensure the main tab is also activated
                localStorage.setItem(config.nestedTabKey, href);
                localStorage.setItem("lastActiveMainTab", config.mainTab);
            }
        });
    });

    const thirdLayerItems = document.querySelectorAll(config.thirdLayerSelector);
    thirdLayerItems.forEach(thirdLayerItem => {
        thirdLayerItem.addEventListener("click", function () {
            const href = this.getAttribute("href");
            if (href) {
                // Save the active third-level tab
                localStorage.setItem(config.thirdLayerKey, href);
            }
        });
    });
}

/**
 * Restores the last active nested and third-level tabs from local storage.
 * If no tab is stored, defaults to the first tab in each level.
 * @param {Object} config - The configuration object for the nested tab.
 */
function restoreNestedAndThirdLayerTabs(config) {
    const activeNestedTab = localStorage.getItem(config.nestedTabKey);
    if (activeNestedTab) {
        // Ensure the parent (main) tab is activated first
        activateTab(config.mainTab);
        // Then activate the nested tab
        activateTab(activeNestedTab);

        const activeThirdLayer = localStorage.getItem(config.thirdLayerKey);
        if (activeThirdLayer) {
            // Activate the third-level tab if it was stored
            activateTab(activeThirdLayer);
        }
    } else {
        // If no active nested tab is stored, default to the first nested tab
        const defaultNestedTabElement = document.querySelector(config.nestedTabSelector);
        if (defaultNestedTabElement) {
            activateTab(defaultNestedTabElement.getAttribute("href"));
        }
    }
}

// Configuration for nested tabs and their corresponding third-level navigation items
const nestedTabsConfig = [
    { mainTab: "#tab1", nestedTabKey: "general-tools-tab", nestedTabSelector: "#toolsTab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "general-tools-3rd-layer" },
    { mainTab: "#tab2", nestedTabKey: "enum-tooling-tab", nestedTabSelector: "#enum-tooling-tab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "enum-tooling-3rd-layer" },
    { mainTab: "#tab3", nestedTabKey: "exploit-assistant-tab", nestedTabSelector: "#exploit-assistant-tab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "exploit-assistant-3rd-layer" },
    { mainTab: "#tab4", nestedTabKey: "shell-assistant-tab", nestedTabSelector: "#shell-assistant-tab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "shell-assistant-3rd-layer" },
    { mainTab: "#tab5", nestedTabKey: "checklist-assistant-tab", nestedTabSelector: "#checklist-assistant-tab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "checklist-assistant-3rd-layer" },
    { mainTab: "#tab6", nestedTabKey: "useful-commands-tab", nestedTabSelector: "#useful-commands-tab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "useful-commands-3rd-layer" },
    { mainTab: "#tab7", nestedTabKey: "activeEnum7Tab", nestedTabSelector: "#enum7Tab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "enum7-3rd-layer" },
    { mainTab: "#tab8", nestedTabKey: "activeEnum8Tab", nestedTabSelector: "#enum8Tab a", thirdLayerSelector: ".custom-nav-item-3rd-layer a", thirdLayerKey: "enum8-3rd-layer" },
];

