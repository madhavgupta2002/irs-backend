const { Client } = require('@elastic/elasticsearch');
const express = require("express");
var cors=require('cors');

const router = express.Router();
const client = new Client({
    node: 'https://860fff9adba14721ba4c7834874e2cbf.us-central1.gcp.cloud.es.io:443',
    auth: {
        apiKey: 'N19YNy1ZMEJKRnRuLVVZcmVJckk6ZGtMQmM4Y0JTdy1Ob2NnNW9LemUzUQ=='
    }
});

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
