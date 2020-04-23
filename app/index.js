// Load enviorment variables from .env
require('dotenv').config()
// loading libraries
const express = require("express")
const cors = require("cors")
const fetch = require("node-fetch")
const favicon = require('serve-favicon')
const path = require('path')
const payload = require("./graphql/payload.js")
const ExpressCache = require('express-cache-middleware')
const cacheManager = require('cache-manager')

const cacheMiddleware = new ExpressCache(
    cacheManager.caching({
        store: 'memory',
        max: 10000, //10k key:pair cache
        ttl: 30 * 30 //30mins
    }), {
        hydrate: (req, res, data, cb) => {
            signale.note(req.cacheKey + " :Served from cache")
            try {
                // added cached:true to json if data is served from cache
                // only do this if data is json
                data = {
                    cached: true,
                    ...JSON.parse(data)
                }
            } catch (error) {
                signale.error(error)
            }
            cb(null, data)
        }
    }
)

// Signale config
const signale = require("signale")

// error logging for prod
if (process.env.NODE_ENV === 'production') {
    const Sentry = require('@sentry/node');
    Sentry.init({
        // dsn: process.env.SENTRY_URL,
        dsn: 'https://1f8f3085586b4f83a613930697d370e3@o380288.ingest.sentry.io/5205944'
    });
    signale.info("Sentry initialized")
}

const githubToken = process.env.GITHUB_TOKEN;
const githubSearchToken = process.env.GITHUB_APP_TOKEN;

// helper function to fetch data
function theFetchMachine(query) {
    return req = fetch('https://api.github.com/graphql', {
            method: 'POST',
            body: JSON.stringify(query),
            headers: {
                'Authorization': `Bearer ${githubToken}`,
            },
        }).then(res => res.text())
        .then(body => {
            return JSON.parse(body)
        })
        .catch(error => signale.fatal(error));
}


var app = express();

app.use(favicon(path.join(__dirname, './', 'favicon.ico')))

// FOR NOW CORS IS ALLOWED FROM *
// const serverOptions = {
//     cors: {
//         origin: [
//             'https://gitstats*', // heroku app
//             'http://gitstats*', // heroku app
//             'www.gitstats*', // heroku app
//             'https://gitstats-prod.herokuapp.com', // heroku app
//             'https://gitstats-stage.herokuapp.com', // heroku app
//             'http://gitstats-prod.herokuapp.com', // heroku app
//             'http://gitstats-stage.herokuapp.com', // heroku app
//             'https://localhost:5000', // client on local
//             'https://localhost:4000', // client on local
//             'https://localhost:3000', // client on local
//             'http://localhost:5000', // client on local
//             'http://localhost:4000', // client on local
//             'http://localhost:3000', // client on local
//         ],
//         methods: ['GET', 'POST', 'OPTIONS', 'PUT'],
//         allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
//         credentials: true,
//     },
// };
// app.use(cors(serverOptions.cors));

// cors allow all
app.use(cors());

// static files here
app.use('/static', express.static('public'))

// query rate limit
app.use('/rate_limit', (req, res) => {
    // params:,
    const query = payload.rateLimit()
    signale.time(`TIME      Query rate limit`);

    Promise.resolve(theFetchMachine(query)).then(data => {
        res.json(data)
        signale.timeEnd(`TIME      Query rate limit`);
    }).catch(err => signale.fatal(err))
});




// Layer the caching in front of the other routes
cacheMiddleware.attach(app)
// CACHE RESPONSE OF ALL THE APIS BELOW THIS

// user search api
// query pinned repos
app.use('/search/:username', (req, res) => {
    signale.info(`${req.params.username} data requested!`)
    const username = req.params.username;
    signale.time(`TIME      fetch search ${username}`);
    // actual search very limited
    // let URL=`https://api.github.com/search/users?q=${username}&access_token=${githubSearchToken}`
    // list only named user
    let URL = `https://api.github.com/users/${username}?access_token=${githubSearchToken}`
    fetch(URL)
        .then(res => res.json())
        .then(json => {
            res.json(json)
            signale.timeEnd(`TIME      fetch search ${username}`);
        })
        .catch(err => signale.fatal(err));
});

// return repos of users+ commits on those repos by user with id ":id"
app.use('/repos/:username/:id', (req, res) => {

    signale.info(`${req.params.username} data requested!`)
    const username = req.params.username;
    // const id=`MDQ6VXNlcjI5Nzk2Nzg1"; //for akashraj9828
    const id = req.params.id;
    signale.time(`TIME      fetch repos ${username}`);
    const query = payload.reposPayload(username, id, null)

    Promise.resolve(theFetchMachine(query)).then(data => {
        res.json(data)
        signale.timeEnd(`TIME      fetch repos ${username}`);
    }).catch(err => signale.fatal(err))

});
// query pinned repos
app.use('/pinned/:username', (req, res) => {
    signale.info(`${req.params.username} data requested!`)
    const username = req.params.username;
    signale.time(`TIME      fetch pinned ${username}`);
    const query = payload.pinnedPayload(username)
    Promise.resolve(theFetchMachine(query)).then(data => {
        res.json(data)
        signale.timeEnd(`TIME      fetch pinned ${username}`);
    }).catch(err => signale.fatal(err))

});

// query basic info
app.use('/:username', (req, res) => {
    signale.info(`${req.params.username} data requested!`)
    const username = req.params.username;
    signale.time(`TIME      fetch basic ${username}`);
    const query = payload.userPayload(username)
    Promise.resolve(theFetchMachine(query)).then(data => {
        res.json(data)
        signale.timeEnd(`TIME      fetch basic ${username}`);
    }).catch(err => signale.fatal(err))
});


// base query
app.use("/", (req, res) => {
    res.json({
        msg: "This is api for GitStats",
        hint: {
            1: "try querying /{username}",
            2: "to get api request limit /rate_limit",
            3: "/repos",
            4: "/pinned",
            5: "/{username}",
            6: "/search/{username}"
        }
    })
})

// 3000 for frontend on local machine
const port = 5000;

const server = app.listen(process.env.PORT || port, "0.0.0.0", () => {
    signale.start(`STARTING SERVER`)
    var host = server.address().address;
    var port = server.address().port;
    signale.success(`EXPRESS SERVER LISTENING LIVE AT ${host}:${port}`)
})