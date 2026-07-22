const fs=require('fs');
let c=fs.readFileSync('public/js/pages/whatsapp.js','utf8');
c = c.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('public/js/pages/whatsapp.js',c);
