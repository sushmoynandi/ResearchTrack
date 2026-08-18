const http = require('http')

function makeRequest(token, payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload)
    const req = http.request({
      hostname: 'localhost',
      port: 3809,
      path: '/api/papers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${token}`
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

async function testAddPaper() {
  console.log('Testing adding a paper via API...')
  
  // 1. First login as student to get token
  const loginRes = await new Promise((resolve) => {
    const postData = JSON.stringify({ email: 'student@papertrack.edu', password: 'password123' })
    const req = http.request({
      hostname: 'localhost',
      port: 3809,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve(JSON.parse(data)))
    })
    req.write(postData)
    req.end()
  })

  console.log('Login token received:', !!loginRes.token)

  // 2. Add paper
  const newPaper = {
    title: 'Deep Residual Learning for Image Recognition',
    authors: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun',
    abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.',
    doi: '10.1109/CVPR.2016.90',
    journal: 'CVPR 2016',
    publicationYear: 2016,
    status: 'TO_READ',
    priority: 'HIGH',
    tags: ['resnet', 'computer-vision'],
  }

  const addRes = await makeRequest(loginRes.token, newPaper)
  console.log('Add paper response status:', addRes.status, 'Data:', addRes.data?.title || addRes.data)
}

testAddPaper()
