const { Client } = require('@elastic/elasticsearch');
const express = require("express");
var cors = require('cors');
const router = express.Router();
router.use(cors());

const API_KEY = "";           // API key missing

const client = new Client({
    node: 'https://197566baa3084a29a18f60154f5a9fe9.us-central1.gcp.cloud.es.io:443',
    auth: {
        apiKey: 'SUNVRUM0OEJuWlBCWTNsYWRPc086UVhPckY1a2lUWnV0bzlaZUprYVh3dw=='
    }
});



async function callOpenAIAPI(query) {
    console.log("Calling the OpenAI API");
    const prompt = `User Query: "${query}"
    Based on the above User Query for a search engine, generate 5 similar queries capturing the user's intent for better results
    NOTE: Just write 5 queries separated by commas strictly in a simple line (dont do any numbering or any punctuation)
    `
    const APIBody = {
        "model": "gpt-3.5-turbo",
        "messages": [{ "role": "user", "content": prompt }],
        "temperature": 0,
        "max_tokens": 60,
        "top_p": 1.0,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    }
    let GPTResponse = "";

    await fetch("https://api.openai.com/v1/chat/completions?", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify(APIBody)
    }).then((data) => {
        return data.json();
    }).then((data) => {
        data.choices.forEach(choice => {
            GPTResponse = choice.message.content;
            // console.log(choice.message.content);
        });
    });
    return GPTResponse;

}


async function search(query) {
    try {
        // const resp = await callOpenAIAPI(query);
        const resp = query;      // fix the openAI api call
        console.log(resp);
        const queriesArray = resp.split(', ');
        // queriesArray.push(query);
        console.log(queriesArray);
        let allHits = [];

        for (const q of queriesArray) {
            const searchResult = await client.search({
                index: 'search-pdf-docs',
                q: q
            });
            console.log("processing query " + q);

            allHits.push(...searchResult.hits.hits);
        }

        // Sort hits by score
        allHits.sort((a, b) => b._score - a._score);

        // Remove duplicates based on _id
        const uniqueHits = allHits.filter((hit, index, self) =>
            index === self.findIndex(h => h._id === hit._id)
        );

        console.log(uniqueHits);
        console.log(allHits.length);
        console.log(uniqueHits.length);

        // Without AI
        // const searchResult = await client.search({
        //     index: 'search-pdf-docs',
        //     q: queriesArray[5]
        // });
        // let searchHits=searchResult.hits.hits
        // console.log(searchHits);

        return uniqueHits;

    }
    catch {
        let allHits = [];
        return allHits;
    }
}


router.get("/", async function (req, res, next) {
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
