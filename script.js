// Implements triggerDownload so index.html's download triggers work
function triggerDownload(filename) {
    if (!filename) return;
    let url = `/force_file?name=${encodeURIComponent(filename)}`;
    // create and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 250);
}
