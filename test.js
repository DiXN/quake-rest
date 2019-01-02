const request = require('supertest')
const app = require('./app')

describe('Test the root path', () => {
  test('access to root path with invalid server should return 500', () => {
    return request(app).get('/?server=').then(res => {
      expect(res.statusCode).toBe(500)
    })
  })

  test('access to root path with multiple servers should return 200', () => {
    return request(app).get('/?server=87.118.125.187:28971;92.222.75.18:28964').then(res => {
      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveLength(2)
    })
  })
})

describe('Test IP validity', () => {
  test('22 is invalid and should return 500', () => {
    return request(app).get('/ip/22').then(res => {
      expect(res.statusCode).toBe(500)
    })
  })
  test('myhost.hosting:32 has invalid port and should return 500', () => {
    return request(app).get('/ip/myhost.hosting:32').then(res => {
      expect(res.statusCode).toBe(500)
    })
  })
  test('87.118.125.187:28971 is valid and should return 200', () => {
    return request(app).get('/ip/87.118.125.187:28971').then(res => {
      expect(res.statusCode).toBe(200)
    })
  })
})

describe('Test timeout', () => {
  test('89.163.251.169:19607 should timeout since it is an unsupported IP', () => {
    return request(app)
    .get('/ip/89.163.251.169:19607').expect(200).then(res => {
      expect(res.body.status).toBe('DOWN')
    })
  })
})

describe('Test Content-Type json', () => {
  test('if IP is valid, Content-Type should be JSON', (done) => {
    return request(app)
      .get('/ip/92.222.75.18:28964')
      .expect(200)
      .expect('Content-Type', /json/, done)
  })
  test('if IP is valid and parameter is pretty, Content-Type should be HTML', (done) => {
    return request(app)
      .get('/ip/88.99.92.218:28002?print=pretty')
      .expect(200)
      .expect('Content-Type', /html/, done)
  })
})

describe('Test server properties', () => {
  test('if the server is up then the number of players should be greater than or equal 0', () => {
    return request(app)
      .get('/ip/92.222.75.18:28964').expect(200).then(res => {
        const response = res.body
        if(response.status === 'UP') {
          expect(Number(response.numplayers)).toBeGreaterThanOrEqual(0)
        }
    })
  })
  test('if the server is up and the number of players is greater than or equal 0 then the list should not be empty', () => {
    return request(app)
      .get('/ip/88.99.92.218:28002').expect(200).then(res => {
        const response = res.body
        if(response.status === 'UP' && response.numplayers > 0) {
          expect(response.list_of_players.length > 0).toBeTruthy()
        }
    })
  })
})
