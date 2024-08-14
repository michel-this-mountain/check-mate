/**
 * initTabPersistence()
 *
 * This function is responsible for maintaining the active tab state across pages.
 * Once a tab or subtab has been clicked, it should hold track of where the user is, using local storage, on restart of the plugin
 */
function initTabPersistence() {
    // activate the first tab by default, if it isn't already set in local storage
    const LAYER_1_TAB = "layer_1_tab"
    const LAYER_2_TAB = "layer_2_tab"
    const LAYER_3_TAB = "layer_3_tab"

    const mainTab = localStorage.getItem(LAYER_1_TAB) === null ? "#tab1" : localStorage.getItem(LAYER_1_TAB);

    if (mainTab) {
        activateTab(mainTab);
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
            console.log(targetHref)

            if (targetHref) {
                Object.keys(tabs).forEach(function (key) {

                    // layer 1
                    if (tabs[key].includes(targetHref) && key === "layer_1") {
                        localStorage.setItem(LAYER_1_TAB, targetHref);
                        localStorage.setItem(LAYER_2_TAB, null);
                        localStorage.setItem(LAYER_3_TAB, null);
                        activateTab(targetHref);
                    }

                    // layer 2
                    else if (tabs[key].includes(targetHref) && key === "layer_2") {
                        localStorage.setItem(LAYER_2_TAB, targetHref);
                        localStorage.setItem(LAYER_3_TAB, null);
                        activateTab(targetHref);
                    }

                    // layer 3
                    else if (tabs[key].includes(targetHref) && key === "layer_3") {
                        localStorage.setItem(LAYER_3_TAB, targetHref);
                        activateTab(targetHref);
                    }
                });
            }
        });
    });

    // set the layer 1 tab if possible
    if (localStorage.getItem(LAYER_1_TAB) !== null && tabs["layer_1"].includes(localStorage.getItem(LAYER_1_TAB))) {
        activateTab(localStorage.getItem(LAYER_1_TAB));
    }

    // set the layer 2 tab if possible
    if (localStorage.getItem(LAYER_2_TAB) !== null && tabs["layer_2"].includes(localStorage.getItem(LAYER_2_TAB))) {
        activateTab(localStorage.getItem(LAYER_2_TAB));
    }

    // set the layer 3 tab if possible
    if (localStorage.getItem(LAYER_3_TAB) !== null && tabs["layer_3"].includes(localStorage.getItem(LAYER_3_TAB))) {
        activateTab(localStorage.getItem(LAYER_3_TAB));
    }

}

/**
 * activateTab()
 *
 * Activate a tab by tabId
 * @param tabId
 */
function activateTab(tabId) {
    const tabElement = document.querySelector(`a[href="${tabId}"]`);
    if (tabElement) {
        const tab = new bootstrap.Tab(tabElement);
        tab.show();
        tabElement.classList.add('active-link');
    }
}

// Define the tabs for each layer
const tabs = {
    "layer_1": ["#tab1", "#tab2", "#tab3", "#tab4", "#tab5", "#tab6", "#tab7", "#tab8"],

    "layer_2": ["#encode_decode", "#hashing", "#formatter",
                "#enum-tooling-spider", "#enum-tooling-toolbox", "#enum-tooling-iframe-checker", "#enum-tooling-message-listener",
                "#exploit-assistant-csrf-checker",
                "#shell-assistant-reverse-shells", "#shell-assistant-bind-shells", "#shell-assistant-transfer-methods", "#shell-assistant-msf-content",
                "#checklist-assistant-web-checklist", "#checklist-assistant-linux-os-checklist", "#checklist-assistant-windows-os-checklist"],

    "layer_3": ["#enum-tooling-cookie-monitor-tab", "#enum-tooling-postmessage-monitor-tab",
                "#checklist-assistant-web-wordpress-check-content", "#checklist-assistant-web-general-check-content",
                "#checklist-assistant-linux-privesc-content", "#checklist-assistant-windows-privesc-content"
    ]
}