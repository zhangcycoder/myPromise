const MyPromise = require('./myPromise')
const util = require('./util')
const fs = require('fs')
// fs.readFile()
// const readFile = util.promisify(fs.readFile)

// readFile('./data/test1.json', 'utf8').then(res => {
//     console.log(res, 'res')
// }, (err) => {
//     console.log(err)
// })


const fsFunctions = util.promisifyAll(fs)

fsFunctions.readFileAsync('./data/test13.json', 'utf8').then(res => {
    console.log(res, 'res')
}, (err) => {
    console.log(err)
})

