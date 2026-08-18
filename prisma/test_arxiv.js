const http = require('http')

function testArxiv(query) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3809,
      path: `/api/arxiv?id=${encodeURIComponent(query)}`,
      method: 'GET',
      timeout: 8000
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, raw: data })
        }
      })
    })
    req.on('error', (err) => resolve({ error: err.message }))
    req.end()
  })
}

async function run() {
  console.log('Testing /api/arxiv metadata ingestion...')
  const res = await testArxiv('1706.03762')
  console.log('Status:', res.status, 'Title:', res.data?.title, 'Authors:', res.data?.authors?.slice(0, 50))
}

run()
