// Implements triggerDownload so index.html's download triggers work
function triggerDownload(filename) {
    if (!filename) return;

    // Check if terms accepted, if not, show the modal and block download
    if (!localStorage.getItem("termsAccepted")) {
        // Show terms modal if hidden
        const termsModal = document.getElementById("terms-modal");
        if (termsModal) {
            termsModal.style.display = ""; // Show the modal
        }
        // Optionally, you may want to scroll to the modal or focus it
        return;
    }

    let url = `/force_file?name=${encodeURIComponent(filename)}`;
    // create and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 250);
}

// ---- Accept Terms logic (run on startup) ----
(function setupAcceptTerms(){
    document.addEventListener("DOMContentLoaded", function() {
        const termsModal = document.getElementById("terms-modal");
        const storeContent = document.getElementById("store-content");
        const acceptBtn = document.getElementById("acceptBtn");

        // Show/hide UI based on acceptance
        function updateTermsUI() {
            if (localStorage.getItem("termsAccepted")) {
                if (termsModal) termsModal.style.display = "none";
                if (storeContent) storeContent.style.display = "";
            } else {
                if (termsModal) termsModal.style.display = "";
                if (storeContent) storeContent.style.display = "none";
            }
        }

        // Accept click handler
        if (acceptBtn) {
            acceptBtn.addEventListener("click", function() {
                localStorage.setItem("termsAccepted", "yes");
                updateTermsUI();
            });
        }

        updateTermsUI();
    });
})();
