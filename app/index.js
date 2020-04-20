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
    Sentry.init({
        dsn: 'https://1f8f3085586b4f83a613930697d370e3@o380288.ingest.sentry.io/5205944'
    });
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
            'https://localhost:5000', // client on local
            'https://localhost:3000', // client on local
            'http://localhost:5000', // client on local
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

function theFetchMachine(query) {
    return req = fetch('https://api.github.com/graphql', {
            method: 'POST',
            body: JSON.stringify(query),
            headers: {
                'Authorization': `Bearer ${githubToken}`,
            },
        }).then(res => res.text())
        .then(body =>
            json_data = JSON.parse(body)
        )
        .catch(error => signale.fatal(error));
}


// query rate limit
app.use('/rate_limit', (req, res) => {
    // params:,
    const username = req.params.username;
    const query = payload.rateLimit()

});



// query repos

// total commit calculation formula
// const repos=json_data.data.user.repositories.nodes
// let sum=0
// repos.forEach(repo => {
//   sum+=repo.contributions.target.userCommits.totalCount
// });
app.use('/repos/:username/:id', (req, res) => {
    signale.info(`${req.params.username} data requested!`)
    const username = req.params.username;
    // const id="MDQ6VXNlcjI5Nzk2Nzg1"; //for akashraj9828
    const id = req.params.id;
    signale.time(`fetch repos ${username}`);
    const query = payload.reposPayload(username,id, null)

    Promise.resolve(theFetchMachine(query)).then(data => {
        res.json(data)
        signale.timeEnd(`fetch repos ${username}`);
    }).catch(err=>signale.fatal(err))

});
// query pinned repos
app.use('/pinned/:username', (req, res) => {
    signale.info(`${req.params.username} data requested!`)
    const username = req.params.username;
    signale.time(`fetch pinned ${username}`);
    const query = payload.pinnedPayload(username)
    Promise.resolve(theFetchMachine(query)).then(data => {
        res.json(data)
        signale.timeEnd(`fetch pinned ${username}`);
    }).catch(err=>signale.fatal(err))

});

// query basic info
app.use('/:username', (req, res) => {
    signale.info(`${req.params.username} data requested!`)
    const username = req.params.username;
    signale.time(`fetch basic ${username}`);
    const query = payload.userPayload(username)
    Promise.resolve(theFetchMachine(query)).then(data => {
        res.json(data)
        signale.timeEnd(`fetch basic ${username}`);
    }).catch(err=>signale.fatal(err))
});


// base query
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