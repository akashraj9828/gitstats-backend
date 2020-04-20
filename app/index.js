// Load enviorment variables from .env
require('dotenv').config()
// loading libraries
const express = require("express")
const cors = require("cors")
const fetch = require("node-fetch")
const favicon = require('serve-favicon')
const path = require('path')
const payload = require("./graphql/payload.js")


// Signale config
const signale = require("signale")

// error logging for prod
if (process.env.NODE_ENV === 'production') {
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://1f8f3085586b4f83a613930697d370e3@o380288.ingest.sentry.io/5205944' });
signale.info("Sentry initialized")
}


const githubToken = process.env.GITHUB_TOKEN;

var app = express();

app.use(favicon(path.join(__dirname, './', 'favicon.ico')))

const serverOptions = {
    cors: {
        origin: [
            'https://gitstats-prod.herokuapp.com', // heroku app
            'https://gitstats-stage.herokuapp.com', // heroku app
            'http://gitstats-prod.herokuapp.com', // heroku app
            'http://gitstats-stage.herokuapp.com', // heroku app
            'https://localhost:5000',// client on local
            'https://localhost:3000', // client on local
            'http://localhost:5000',// client on local
            'http://localhost:3000', // client on local
        ],
        methods: ['GET', 'POST', 'OPTIONS', 'PUT'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        credentials: true,
    },
};  
app.use(cors(serverOptions.cors));

// cors allow all
// app.use(cors());

app.use('/rate_limit', (req, res) => {
    // params:,
    const username = req.params.username;
    const query = payload.rateLimit()

    fetch('https://api.github.com/graphql', {
            method: 'POST',
            body: JSON.stringify(query),
            headers: {
                'Authorization': `Bearer ${githubToken}`,
            },
        }).then(res => res.text())
        .then(body => {
            json_data = JSON.parse(body)
            str = JSON.stringify(json_data, null, 2)
            console.log(str);
            res.json({
                ...json_data
            })
        })
        .catch(error => console.error(error));
});

app.use('/:username', (req, res) => {
    signale.info(`-------${req.params.username} data requested!`)
    const username = req.params.username;
    signale.time(`fetch ${username}`);
    const query = payload.userPayload(username)

    fetch('https://api.github.com/graphql', {
            method: 'POST',
            body: JSON.stringify(query),
            headers: {
                'Authorization': `Bearer ${githubToken}`,
            },
        }).then(res => res.text())
        .then(body => {
            json_data = JSON.parse(body)
            // str = JSON.stringify(json_data, null, 2)
            // console.log(str);
            res.json({
                ...json_data
            })
            signale.timeEnd(`fetch ${username}`);
        }) 
        .catch(error => signale.fatal(error));
});

app.use("/", (req, res) => {
    res.json({
        msg: "This is api for GitStats",
        hint: {
            1: "try querying /{username}",
            2: "to get api request limit /rate_limit"
        }
    })
})

// 3000 for frontend on local machine
const port = 5000;

const server = app.listen(process.env.PORT || port, () => {
    signale.start(`STARTING SERVER`)
    var host = server.address().address;
    var port = server.address().port;
    signale.success(`EXPRESS SERVER LISTENING LIVE AT ${host}:${port}`)
})