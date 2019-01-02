const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const dgram = require('dgram')
const cors = require('cors')

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())

const udpRequest = (serverAddress, print) => {
  return new Promise((resolve, reject) => {
    if (!serverAddress.match('^.*:[0-9]{3,5}$')) {
      reject('ip invalid!')
    }

    const client = dgram.createSocket('udp4')

    const server = {
      ip: serverAddress.split(':')[0],
      port: serverAddress.split(':')[1],
    }

    const message = Buffer.from('\xFF\xFF\xFF\xFFgetstatus\x00'.split('').map((x) => x.charCodeAt(0)))
    var hasMessage = false

    client.on('listening', () => {
      setTimeout(() => {
        if (!hasMessage) {
          client.close()
          resolve({ ip: serverAddress, status: 'DOWN'})
        }
      }, 750)
    })

    client.on('error', (err) => {
      client.close()
      reject(`socket error:\n${err.stack}`)
    })

    client.on('message', (msg) => {
      hasMessage = true

      const isPretty = print != null && print === 'pretty'
      const infos = msg.toString().split('\\').slice(1).map((x) => x.replace(/\^[0-9]/g, ''))

      let serverProperties = {}
      for (let i = 0; i < infos.length / 2; i++) {
        serverProperties[infos[i * 2]] = infos[i * 2 + 1]
      }

      const rawPlayerString = Object.entries(serverProperties).find((y) => y[1].indexOf('\n') !== -1)

      const entry = {
        key: rawPlayerString[0],
        value: rawPlayerString[1]
      }

      const players = entry.value.split('\n').slice(1, -1).map((x) => {
        const match = (/(\d+) (\d+) \"(.*)\"/g).exec(x)
        return match != null ? isPretty ? `${match[1]}, ${match[2]}, ${match[3]}` : `${match[1]},${match[2]},${match[3]}` : ''
      })

      serverProperties[entry.key] = entry.value.split('\n')[0]
      serverProperties.sv_maxclients = serverProperties.sv_privateClients ? (
        Number(serverProperties.sv_maxclients) - Number(serverProperties.sv_privateClients)).toString() : serverProperties.sv_maxclients

      client.close()

      resolve({
        ...serverProperties,
        ...{ status: 'UP', numplayers: players.length.toString(),
        list_of_players: players.filter((x) => x !== '') }}
      )
    })

    client.send(message, 0, message.length, Number(server.port), server.ip)
  })
}

app.get('/', (req, res) => {
  if (!req.query.server) {
    return res.status(500).send('query parameter invalid!')
  }

  const servers = req.query.server.split(';')
  const serverRequests = servers.map(s => udpRequest(s, null))

  Promise.all(serverRequests).then(resp => {
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(resp)
  })
})

app.get('/ip/:ip', (req, res) => {
  const print = req.query.print

  udpRequest(req.params.ip, print)
    .then(resp => {
      const isPretty = print != null && print === 'pretty'

      if (isPretty) {
        res.status(200).send(`<pre style='word-wrap: break-word; white-space: pre-wrap;'>${
          JSON.stringify(resp, null, 2)}
        </pre>`)
      } else {
        res.setHeader('Content-Type', 'application/json')
        res.status(200).send(resp)
      }
    })
    .catch(resp => res.status(500).send(resp))
})

module.exports = app
