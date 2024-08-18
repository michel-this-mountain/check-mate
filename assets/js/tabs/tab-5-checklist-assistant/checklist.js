const checklist = {
    windows: {
        base_checklist: {
            title: "General checklist - windows pentesting",
            checks: [
                {
                    title: "Check for C:\\Users",
                    description: "Is the C:\\Users directory present?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                },
                {
                    title: "Check for C:\\Windows",
                    description: "Is the C:\\Windows directory present?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                }
            ]
        }
    },
    linux: {
        base_checklist: {
            title: "General checklist - linux pentesting",
            checks: [
                {
                    title: "Check for /etc/passwd",
                    description: "Is the /etc/passwd file present?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                },
                {
                    title: "Check for /etc/shadow",
                    description: "Is the /etc/shadow file present?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                }
            ]
        }
    },
    web: {
        base_checklist: {
            title: "General checklist - web pentesting",
            checks: [
                {
                    title: "Check for robots.txt/ sitemap.xml",
                    description: "From the website url, check for the files '/robots.txt' and '/sitemap.xml'. Are they present?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                },
                {
                    title: "Check for admin panel",
                    description: "Is an admin panel present? If yes, what is the URL?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                }
            ]
        },
        wordpress_checklist: {
            title: "Wordpress checklist - web pentesting",
            checks: [
                {
                    title: "Check for wp-config.php",
                    description: "Is the wp-config.php file present?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                },
                {
                    title: "Check for wp-admin",
                    description: "Is the wp-admin directory present?",
                    notes: "",
                    checkbox: true,
                    textarea: true,
                    rows: 2
                }
            ]
        }
    }
}

function initChecklistAssistantContent(){
    buildChecklistRows(checklist.web.base_checklist, "web-general-pentest-checklist");
    buildChecklistRows(checklist.web.wordpress_checklist, "web-wordpress-pentest-checklist");
    buildChecklistRows(checklist.linux.base_checklist, "linux-general-privesc-checklist");
    buildChecklistRows(checklist.windows.base_checklist, "windows-general-privesc-checklist");
}

function buildChecklistRows(checklist, tbodyId) {
    for (let i = 0; i < checklist.checks.length; i++) {

        // retrieve the current check element, id and content
        let currentCheck = checklist.checks[i];
        let tr = createElement("tr", []);
        let tdContent = createElement("td", []);

        // set the tdInnerHTML to the current check content
        tdContent.innerHTML += buildCheckbox(i + 1, `${EncoderDecoder.encodeBase64(currentCheck.title)}`, currentCheck.description);
        tdContent.innerHTML += buildTextArea(`${EncoderDecoder.encodeBase64(currentCheck.title)}-check`, currentCheck.rows);

        // append the elements to the tr
        tr.appendChild(tdContent)

        // append the tr to the tbody
        document.getElementById(tbodyId).appendChild(tr);
    }
}

/**
 * buildTextArea()
 *
 * build a textarea with a copy button
 *
 * @param rows = the number of rows
 * @param id = the id of the textarea
 * @returns {string} html of a textarea with copy button
 */
function buildTextArea(id, rows) {
    let textarea = `
        <div class="form-group">
            <!-- start textarea and copybutton-->
            <div class="position-relative d-flex">
                <textarea
                        class="form-control"
                        rows="${rows}"
                        id="${id}"
                        style="width: 100%; padding-right: 40px;"></textarea>
                <a href="#">
                    <img class="copy-icon"
                         src="assets/icons/general/copy.png"
                         style="position: absolute; bottom: 5px; right: 5px;"
                         height="25px"
                         width="25px"
                         alt="Copy">
                </a>
            </div>
        </div>`;


    return textarea;
}

/**
 * buildCheckbox()
 *
 * build a checkbox with a title
 *
 * @param id id of the checkbox
 * @param title title that is part of the checkbox
 * @param index index of the checkbox
 * @returns {string}
 */
function buildCheckbox(index, id, command) {
    let checkbox = `
        <div>
            
            <div class="d-flex justify-content-left">
                <span>${index})&nbsp;</span>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="${id}">
                </div> 
            </div>
            
            <div>${command}</div>
        </div>`;

    return checkbox;
}