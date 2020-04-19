// Load enviorment variables from .env
require('dotenv').config()

// loading libraries
const express = require("express")
const signale = require("signale")
const cors = require("cors")
const fetch = require("node-fetch")
const payload = require("./graphql/payload.js")

var app = express();


const githubToken = process.env.GITHUB_TOKEN;
// Express app

// *********************** WILL use CORS in PROUDUCTION BUILD ONLY

// const serverOptions = {
//     cors: {
//         origin: [
//             'http://gitstats-prod.herokuapp.com', // heroku app
//             'http://localhost:4000',// client on local
//             'http://localhost:3000', // client on local
//         ],
//         methods: ['GET', 'POST', 'OPTIONS', 'PUT'],
//         allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
//         credentials: true,
//     },
// };


// app.use(cors(serverOptions.cors));

// *********************** WILL use in PROUDUCTION BUILD ONLY


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

    // params:,
    const username = req.params.username;
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
            str = JSON.stringify(json_data, null, 2)
            console.log(str);
            res.json({
                ...json_data
            })
        }) // {"data":{"repository":{"issues":{"totalCount":247}}}}
        .catch(error => console.error(error));
});

const port = 3000;

const server = app.listen(process.env.PORT || port, () => {
    signale.info(`-------STARTING SERVER`)
    var host = server.address().address;
    var port = server.address().port;
    signale.success(`-------EXPRESS SERVER LISTENING LIVE AT ${host}:${port}`)
})