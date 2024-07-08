// content-script.js

// Function to log the current document's domain when a button is clicked
function logDomainOnClick() {
    document.querySelectorAll("button[id^='test']").forEach(button => {
        button.addEventListener("click", function () {
            alert(document.domain);
        });
    });
}

// Run the function to attach the event listeners
logDomainOnClick();
