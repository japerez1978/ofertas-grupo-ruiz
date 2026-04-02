const https = require('https');
https.get('https://intranox-proxy-production.up.railway.app/proxy/crm/v3/properties/deals', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const props = JSON.parse(data).results || [];
    const matched = props.filter(p => JSON.stringify(p).toLowerCase().includes('fecha obj') || JSON.stringify(p).toLowerCase().includes('ofertar'));
    console.log(matched.map(p => p.name + " -> " + p.label).join('\n'));
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
