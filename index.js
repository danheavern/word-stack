const filter = require('./scripts/filter')
const fs = require('fs')
const moment = require('moment')
const express = require('express')
const cors = require('cors')

const app = express();

const port = process.env.PORT || 3000

app.use(cors())

app.get('/', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('index.html').pipe(res)
})

app.get('/word', (req,res) => {
    res.writeHead(200, { 'content-type': 'text/plain' })
    const wordIndex = getDayIndex();
    fs.readFile('./assets/shuffled.txt', 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        const arr = data.split(',');
        res.end(arr[wordIndex])
    })
})

app.get('/random', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' })
    fs.readFile('./assets/shuffled.txt', 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        const arr = data.split(',');
        const rand = Math.floor(Math.random() * arr.length);
        res.end(arr[rand])
    })
})

app.use(express.static('style'))
app.use(express.static('scripts'))
app.use(express.static('images'))

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})

function getDayIndex() {
    const start = moment('20220405 00:00', 'YYYYMMDD HH:mm')
    const today = moment()
    return today.diff(start, 'days')
}
