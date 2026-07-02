const fs = require('fs');
const path = 'c:/Users/fadib/AppData/Roaming/Code/copilot-terminal-output/copilot-terminal-output-89eab355-5654-430b-9f53-4520328724df.txt';
const txt = fs.readFileSync(path, 'utf8');
const patterns = ['low-contrast','line-length','cramped-padding','clipped-overflow-container','text-overflow','dark-glow','tight-leading','all-caps-body','nested-cards'];
const counts = {};
for (const p of patterns) {
  const re = new RegExp('"antipattern"\\s*:\\s*"'+p+'"','g');
  const m = txt.match(re);
  counts[p] = m ? m.length : 0;
}
console.log(JSON.stringify(counts,null,2));
