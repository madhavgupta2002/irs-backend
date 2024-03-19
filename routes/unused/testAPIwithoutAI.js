const { Client } = require('@elastic/elasticsearch');
const express = require("express");
var cors=require('cors');

const router = express.Router();
const client = new Client({
    node: 'https://14d002628c614b1199230d8807744824.us-central1.gcp.cloud.es.io:443',
    auth: {
        apiKey: 'WGJDYlZJNEIyMGhDX1V0SlRad1M6TkhTSm1LeVBTc3VoOGYwakNoZkN1Zw=='
    }
});
// a60bf74f658e42058af03652095b7e6c:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJDE0ZDAwMjYyOGM2MTRiMTE5OTIzMGQ4ODA3NzQ0ODI0JDI5NjM1YjQ4NWU4MjRjZjFiN2EyMzFhZmY1Y2VmZjdk
async function search(query) {
    const searchResult = await client.search({
        index: 'search-pdf-docs',
        q: query
    });
    return searchResult.hits.hits;
}

router.use(cors());

router.get("/", async function(req, res, next) {
    try {
        const query = req.query.q;
        const searchData = await search(query);
        res.json(searchData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
