(() => {
  const enc = [
    82,100,99,123,101,125,118,126,53,77,116,112,115,44,44,116,100,97,33,10,114,116,77,91,35,116,114,101,120,51,126,123,115,44,44,11,113,125,127,124,53,77,102,100,113,104,122,124,103,125,53,77,124,113,123,115,116,44,44,106,77,104,117,97,125,116,35,53,126,123,115,44,44,102,103,106,101,126,123,115,44,44,97,103,127,110,110,53,77,108,112,125,53,77,116,123,127,122,44,44,116,108,108,53,77,114,103,97,110,35,89,121,111,116,121,117,106,61,44,44,116,126,120,123,113,116,112,119,44,44,49,49,49,10,10,100,101,110,101,105,110,103,44,44,109,101,115,115,97,103,101,58,10,10,86,104,105,115,32,119,97,115,32,106,117,115,116,32,97,32,106,111,107,101,33,32,68,111,110,39,116,32,119,111,114,114,121,32,58,41,32,45,32,98,121,32,48,98,46,108,105,118,105,111,110,32,116,101,97,109,10
  ];
  function decode(arr) {
    return String.fromCharCode(...arr.map(b=>b^13));
  }
  function fakePanic(callback) {
    const panicLines = [
      "SYSTEM ERROR: 0x000000DEAD",
      "MEMORY CORRUPTION DETECTED!",
      "Critical Process Died.",
      "Disk: NO_BOOT_DEVICE",
      "FATAL KERNEL PANIC at 0x00AF13",
      "Heap Overflow! Retrying...",
      "WARNING: SYSTEM INSTABILITY INCREASING!",
      "Exception: Unhandled Promise Panic",
      "Rebooting in 3... 2... 1...",
      "!!! SYSTEM FAILURE !!!"
    ];
    let i=0, rounds=0;
    const clear = () => process.stdout.write('\x1Bc');
    const write = (txt) => process.stdout.write(txt+'\n');
    (function loop() {
      if (rounds>18) { 
        clear(); callback(); return;
      }
      clear();
      for(let k=0;k<8+Math.random()*8;++k)
        write(panicLines[Math.floor(Math.random()*panicLines.length)]);
      rounds++;
      setTimeout(loop, 120+Math.random()*80);
    })();
  }
  function finale() {
    const out = decode(enc);
    for(const line of out.split(',')) {
      if(line.trim()) process.stdout.write(line.trim().replace(/\\n/g,"\n") + "\n");
    }
    process.exit(0);
  }
  if(typeof process!=="undefined" && process.stdout && process.exit) {
    fakePanic(finale);
  }
})();
