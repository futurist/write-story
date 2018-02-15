const util = require('util')
const path = require('path')
const wordPOS = require('wordpos')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

const wordpos = new wordPOS()
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const wordTypes = [
  'adjective',
  'adverb',
  'noun',
  'verb'
]

app.use('/', express.static(path.join(__dirname, 'html')))
app.get('/', (req, res) => {
  res.status(200).end('ok')
})


app.all('/api/:api', (req, res) => {
  // console.log(req.method, req.path, req.query, req.params)
  const {api} = req.params
  const {query={}} = req
  switch (api) {
    case 'rand': {
      let {m=''} = query
      let method = wordTypes.find(x=>x.indexOf(m)==0) || ''
      method = 'rand'+ upperFirst(method)
      // console.log('method', m, method)
      wordpos[method]({count: 3}, words => {
        res.json({words})
      })
      break
    }
    default: {
      res.json({ok: 1})
    }
  }
})

const server = app.listen(8181, () => {
  console.log('service start')
})


function upperFirst(string) 
{
  return (string||'').charAt(0).toUpperCase() + string.slice(1);
}

