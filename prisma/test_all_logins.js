const http = require('http')

function makeRequest(path, payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload)
    const req = http.request({
      hostname: 'localhost',
      port: 3809,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data || '{}') })
      })
    })

    req.on('error', (err) => resolve({ error: err.message }))
    req.write(postData)
    req.end()
  })
}

async function testAll() {
  console.log('Testing live auth endpoints on port 3809...')

  // 1. Student Login
  const student = await makeRequest('/api/auth/login', { email: 'student@papertrack.edu', password: 'password123' })
  console.log('1. Student Login:', student.status === 200 ? 'SUCCESS (Sophia Chen)' : `FAILED: ${JSON.stringify(student)}`)

  // 2. Supervisor Login
  const supervisor = await makeRequest('/api/auth/login', { email: 'supervisor@papertrack.edu', password: 'password123' })
  console.log('2. Supervisor Login:', supervisor.status === 200 ? 'SUCCESS (Dr. Elena Rostova)' : `FAILED: ${JSON.stringify(supervisor)}`)

  // 3. Admin Login
  const admin = await makeRequest('/api/auth/login', { email: 'admin@papertrack.edu', password: 'password123' })
  console.log('3. Admin Login:', admin.status === 200 ? 'SUCCESS (Dean Administrator)' : `FAILED: ${JSON.stringify(admin)}`)

  // 4. Guest Demo Login
  const guest = await makeRequest('/api/auth/guest', {})
  console.log('4. Guest Demo Login:', guest.status === 200 ? `SUCCESS (${guest.data.user?.name})` : `FAILED: ${JSON.stringify(guest)}`)
}

testAll()
