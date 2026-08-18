const http = require('http')

async function testPort(port) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ email: 'student@papertrack.edu', password: 'password123' })
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        resolve({ port, status: res.statusCode, data })
      })
    })

    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.write(postData)
    req.end()
  })
}

async function findServer() {
  const ports = [3000, 3569, 3809, 3001, 3002, 8080]
  // Also scan 3000 to 4000
  for (let p of ports) {
    const res = await testPort(p)
    if (res) {
      console.log(`FOUND ACTIVE SERVER ON PORT ${p}: Status ${res.status}, Response: ${res.data}`)
      return
    }
  }
  console.log('Scanning common ports...')
  for (let p = 3500; p <= 3900; p += 10) {
    const res = await testPort(p)
    if (res) {
      console.log(`FOUND ACTIVE SERVER ON PORT ${p}: Status ${res.status}, Response: ${res.data}`)
      return
    }
  }
}

findServer()
