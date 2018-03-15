const express = require('express')
var cookieParser = require('cookie-parser')
const app = express()
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const ipfsAPI = require('ipfs-api')

const ipfs = ipfsAPI('localhost', '5001', { protocol: 'http' })
const bs58 = require('bs58')
const Web3 = require('web3')
const contract = require('truffle-contract')

const jwt = require('jwt-express')

app.use(cookieParser())
app.use(jwt.init('secret', {
        // uses Authorization header
        cookies: false
    })
)
app.use(express.json())
app.use((req, res, next) => {
    // res.set('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', 'POST')
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept, Cache-Control')
    next()
})
// jwt error handling
app.use(function(err, req, res, next) {
    if (err.name == 'JWTExpressError') {
        // user is unauthorized
        res.status(401)
        res.render('401', {error: err})
    } else {
        next(err);
    }
});

// Import our contract artifacts and turn them into usable abstractions.
const fileindex_artifacts = require('../incentivized-data-share-contracts/build/contracts/FileIndex.json')

const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
var account;

// Get the initial account balance so it can be displayed.
web3.eth.getAccounts(function (err, accs) {
    if (err != null) {
        console.log("There was an error fetching your accounts.");
        return;
    }

    if (accs.length == 0) {
        console.log("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
    }
    console.log(accs)
    accounts = accs;
    account = accounts[0];
    console.log(account)
});

// FileIndex is our usable abstraction, which we'll use through the code below.
var FileIndex = contract(fileindex_artifacts);
// Bootstrap the FileIndex abstraction for Use.
FileIndex.setProvider(web3.currentProvider);

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/login', (req, res) => {
    console.log(req.body)
    FileIndex.deployed().then(function (instance) {
        const fi = instance
        console.log(req.body.email, req.body.password)
        return fi.login(req.body.email, req.body.password)
    }).then(function (result) {
        console.log(`login: ${result}`)
        if (result) {
            const token = res.jwt({email: req.body.email})
            res.send(token)
        } else
            res.end()
    }).catch(function (e) {
        console.log(e)
    });
})

app.post('/logout', jwt.active(), (req, res) => {
    // TODO :: how to logout jwt?
})

app.post('/register', (req, res) => {
    FileIndex.deployed().then(function (instance) {
        const fi = instance
        console.log(req.body.email, req.body.password)
        return fi.register(req.body.email, req.body.password, { from: account })
    }).then(function (result) {
        console.log(`register: ${result}`)
        res.end(JSON.stringify(result))
    }).catch(function (e) {
        console.log(e)
    });
})

app.get('/hashes/:all', jwt.active(), (req, res) => {
    FileIndex.deployed().then(function (instance) {
        const fi = instance
        console.log(req.jwt)
        return fi.getHashes(req.jwt.payload.email, (req.params.all === 'true') )
    }).then(function (result) {
        res.end(JSON.stringify(result))
    }).catch(function (e) {
        console.log(e)
        res.status(500).send(e)
    });
})

app.get('/filename/:hash', jwt.active(), (req, res) => {
    FileIndex.deployed().then(function (instance) {
        // convert to big number to avoid rounding off errors in js float
        const hash = new web3.toBigNumber(req.params.hash)
        const fi = instance
        return fi.getFilename(hash)
    }).then(function (result) {
        res.end(JSON.stringify(result))
    }).catch(function (e) {
        console.log(e)
    });
})

app.get('/file/:hash', jwt.active(), (req, res) => {
    // 1220 is a multihash value of 2 bytes for ipfs
    const bytes = Buffer.from('1220' + req.params.hash.slice(2), 'hex')
    const hash = bs58.encode(bytes)

    ipfs.files.get(hash).then( (files) => {
        files.forEach(file => {
            res.set('Content-Disposition', `attachment;filename=${file.path}`)
            res.set('Content-Type', 'application/octet-stream')
            res.end(file.content)
        })
    })
})

app.post('/upload', jwt.active(), upload.array('files'), (req, res, next) => {
    req.files.forEach((file) => {
        ((file) => {
            console.log(file.originalname)
            console.log(file.path)
            ipfs.util.addFromFs(file.path).then((result) => {
                const buf = bs58.decode(result[0].hash).slice(2)
                const hex = buf.toString('hex')
                // convert to big number to avoid rounding off errors in js float
                const bn = web3.toBigNumber('0x' + hex)

                // store hash and filename to smart contract
                FileIndex.deployed().then(function (instance) {
                    const fi = instance;
                    return fi.storeHash(req.jwt.payload.email, bn, file.originalname, { from: account, gas: 999999 });
                }).then(function (result) {
                    console.log(result)
                    console.log('file details stored in blockchain')
                }).catch(function (e) {
                    console.log(e);
                });
            }, (err) => {
                console.log(err)
            })
        }) (file)
    })
    res.sendStatus(200)
})

app.listen(3000, () => console.log('server started on port 3000!'))
