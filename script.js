// Implements triggerDownload for index.html download buttons
function triggerDownload(filename) {
    if (!filename) return;

    // Verify terms agreement before proceeding
    if (!localStorage.getItem("termsAccepted")) {
        const termsModal = document.getElementById("terms-modal");
        if (termsModal) {
            termsModal.style.display = ""; // Ensure modal is visible
            // Optional: consider focusing modal for accessibility
            if (typeof termsModal.focus === "function") {
                termsModal.focus();
            }
        }
        return;
    }

    const fileUrl = `/force_file?name=${encodeURIComponent(filename)}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = fileUrl;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    setTimeout(() => {
        document.body.removeChild(downloadAnchor);
    }, 250);
}

// -- Terms Acceptance Logic (init on DOM ready) --
(function () {
    document.addEventListener("DOMContentLoaded", function () {
        const termsModal = document.getElementById("terms-modal");
        const storeContent = document.getElementById("store-content");
        const acceptBtn = document.getElementById("acceptBtn");

        function updateTermsUI() {
            const accepted = !!localStorage.getItem("termsAccepted");
            if (termsModal) termsModal.style.display = accepted ? "none" : "";
            if (storeContent) storeContent.style.display = accepted ? "" : "none";
        }

        if (acceptBtn) {
            acceptBtn.addEventListener("click", function () {
                localStorage.setItem("termsAccepted", "yes");
                updateTermsUI();
            });
        }

        updateTermsUI();
    });
})();
