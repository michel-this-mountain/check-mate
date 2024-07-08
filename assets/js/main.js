document.addEventListener("DOMContentLoaded", function () {
    // Retrieve and set the active tab from local storage
    const activeTab = localStorage.getItem("activeTab");
    if (activeTab) {
        const tab = new bootstrap.Tab(document.querySelector(`a[href="${activeTab}"]`));
        tab.show();
        document.querySelector(`a[href="${activeTab}"]`).classList.add('active-link');
    }

    // Add event listener to all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(navLink => {
        navLink.addEventListener('click', function (event) {
            event.preventDefault();

            // Remove active class from all links
            navLinks.forEach(link => {
                link.classList.remove('active-link');
                link.classList.remove('active');
            });

            // Save the active tab to local storage
            const targetHref = event.target.getAttribute("href");
            localStorage.setItem("activeTab", targetHref);

            // Show the selected tab using Bootstrap's tab API
            const tab = new bootstrap.Tab(event.target);
            tab.show();

            // Add active class to the clicked link
            event.target.classList.add('active-link');
            event.target.classList.add('active');
        });
    });

    // Apply the active-link class to the active tab link on page load
    if (activeTab) {
        navLinks.forEach(link => link.classList.remove('active-link'));
        const activeLinkElement = document.querySelector(`a[href="${activeTab}"]`);
        if (activeLinkElement) {
            activeLinkElement.classList.add('active-link');
            activeLinkElement.classList.add('active');
        }
    }
});
