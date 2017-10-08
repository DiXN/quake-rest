const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const dgram = require('dgram')

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/ip/:ip', (req, res) => {
  if (!req.params.ip.match('^.*:[0-9]{3,5}$')) {
    return res.status(500).send('ip invalid!')
  }

  const client = dgram.createSocket('udp4')

  const server = {
    ip: req.params.ip.split(':')[0],
    port: req.params.ip.split(':')[1],
  }

  const message = new Buffer('\xFF\xFF\xFF\xFFgetstatus\x00'.split('').map((x) => x.charCodeAt(0)))
  var hasMessage = false

  client.on('listening', () => {
    setTimeout(() => {
      if (!hasMessage) {
        res.setHeader('Content-Type', 'application/json')
        res.status(200).send(JSON.stringify({ ip: req.params.ip, status: 'DOWN'}))
        client.close()
      }
    }, 750)
  })

  client.on('error', (err) => {
    console.log(`socket error:\n${err.stack}`)
    client.close()
  })

  client.on('message', (msg) => {
    hasMessage = true

    const isPretty = req.query.print != null && req.query.print === 'pretty'
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

    if (isPretty) {
      res.status(200).send(`<pre style='word-wrap: break-word; white-space: pre-wrap;'>${
      	JSON.stringify({...serverProperties, ...{ status: 'UP', numplayers: players.length.toString(), 
      		list_of_players: players.filter((x) => x !== '') }}, null, 2)}</pre>`)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.status(200).send(JSON.stringify({...serverProperties, 
      	...{ status: 'UP', numplayers: players.length.toString(), list_of_players: players.filter((x) => x !== '') }}))
    }

    client.close()
  })

  client.send(message, 0, message.length, Number(server.port), server.ip)
})

module.exports = app
