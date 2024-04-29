const { Client } = require('@elastic/elasticsearch');
const express = require("express");
var cors = require('cors');
const router = express.Router();
router.use(cors());
require("dotenv").config();
const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq((api_key = process.env.GROQ_API_KEY));


const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_KEY
    }
});


async function callGroqAPI(query) {
    console.log("Calling the Groq API");
    const prompt = `User Query: "${query}" Based on the above User Query for a search engine, generate 5 similar queries 
    capturing the user's intent for better results 
    NOTE: Just write 5 short queries separated by commas strictly
     in a simple line (dont do any numbering or any punctuation)
     Do not output any explaination `;

    const completion = await groq.chat.completions
        .create({
            messages: [{ role: "user", content: prompt }],
            model: "mixtral-8x7b-32768",
        })
        .then((chatCompletion) => {
            return chatCompletion.choices[0]?.message?.content || "";
        });

    return completion;
}


async function search(query) {
    try {
        const resp = (await callGroqAPI(query)).replace(/"/g, '');
        // const resp = query;      // fix the openAI api call
        console.log(resp);
        const queriesArray = resp.split(', ');
        queriesArray.push(query);
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
