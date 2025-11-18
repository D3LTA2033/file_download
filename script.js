// Download file utility for index.html
function download(filename, url) {
  // Create an invisible anchor element
  const a = document.createElement("a");
  a.href = url || `/force_file?name=${encodeURIComponent(filename)}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 250);
}

// Example usage:
// download('example.txt');
