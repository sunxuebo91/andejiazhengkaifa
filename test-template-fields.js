const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/esign/templates/TN84E8C106BFE74FD3AE36AC2CA33A44DE/fields',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('模板字段信息:');
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((field, index) => {
        console.log(`${index + 1}. ${field.dataKey || field.key || field.name} - dataType: ${field.dataType}, required: ${field.required}`);
      });
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
