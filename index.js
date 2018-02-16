const util = require('util')
const path = require('path')
const fs = require('fs')
const csv = require('csv')
const objutil = require('objutil')
const MemDB = require('object-cache')
const wordPOS = require('wordpos')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

const wordpos = new wordPOS()
const wordTypes = [
  'adjective',
  'adverb',
  'noun',
  'verb'
]

var dict, server
// console.log(new MemDB([[a,b,c], [d,e,f]], {}, {idKey: 0}))

csv.parse(fs.readFileSync('dict.csv', 'utf8'), {delimiter: ','}, (err, data=[])=>{
  console.log('dict data read:', err, data.length)
  // csv.stringify(data.filter(x=>x && x[5]>=1), (err, out)=>fs.writeFileSync('dict.csv', out))
  // data: [[a,b,c], [d,e,f]]
  // [word,phonetic,definition,translation,pos,collins]
  dict = new MemDB(data, {}, { idKey: '0' })
  // console.log(dict.find('0', 'length'))
  startServer()
})

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
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
      let {m, n=5} = query
      // m: n,v,a,adv
      let method = wordTypes.find(x=>x.indexOf(m)==0) || ''
      method = 'rand'+ upperFirst(method)
      // console.log('method', m, method)
      getWords({method, num: n}, words=>res.json(
        words.map(x=>getResult(x, m)).filter(x=>x && x.def)
      ))
      break
    }
    case 'lookup':{
      let {m, w=''} = query
      let method = wordTypes.find(x=>x.indexOf(m)==0) || ''
      method = 'lookup'+ upperFirst(method)
      wordpos[method](w, words=>{
        // console.log(w, words.map(x=>x.lemma))
        res.json(
          arrayUnique(words.map(x=>x.lemma).filter(x=>x && x!=w))
          .map(x=>getResult(dict.find(0, x), m))
          .filter(x=>x && x.def)
        )
      })
      break
    }
    default: {
      res.json({ok: 1})
    }
  }
})

function getWords(config={}, callback){
  let {method, num=5, prevWords} = config
  prevWords = objutil.ensure(config, 'prevWords', [])[0]
  wordpos[method]({count: num}, words => {
    words.forEach(x=>{
      let def = dict.find(0, x)
      if(def && def[5]>=3){
        prevWords.push(def)
      }
    })
    if(prevWords.length>=num){
      callback(prevWords)
    }else{
      getWords(config, callback)
    }
  })
}

function startServer() {
  server = app.listen(8181, () => {
    console.log('service start')
  })
}

function upperFirst(string) {
  return (string||'').charAt(0).toUpperCase() + string.slice(1);
}

function arrayUnique(arr){
  return Array.from(new Set(arr))
}

function getResult(arrDef, m){
  arrDef = arrDef||[]
  let strDef = arrDef[3]||''
  let word = arrDef[0]
  let arr = (strDef||'').split('\\n')
  if(!m) return {word, def: arrayUnique(arr.filter(Boolean)).join()}
  let method = new RegExp('^'+(m[0]=='v' ? 'v[\\w]+\\. ' : m+'\\. '))
  // console.log('arrDef', arr, m, method)
  let ret = arr.map(x=>{
    const r = method.exec(x)
    return r && x.slice(r[0].length)
  }).filter(Boolean)
  // console.log(ret)
  return {word, def: arrayUnique(ret).join()}
}

