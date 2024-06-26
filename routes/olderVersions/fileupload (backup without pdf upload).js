const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require("body-parser");
const async = require('async');
require("dotenv").config();

const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_KEY
    }
});

var cors = require('cors');
const app = express();
const resp = client.info();
const router = express.Router();
app.use(bodyParser.json());
app.use("/", express.static("public"));
app.use(fileUpload());

async function index(data) {
    console.log(data);
    const result = await client.helpers.bulk({
        datasource: data,
        pipeline: "ent-search-generic-ingestion",
        onDocument: (doc) => ({ index: { _index: 'search-pdf-docs' } }),
    });
    console.log("Hi");
    console.log(result);
}

app.post("/list-files", async (req, res) => {
    const ourList = await listFiles();
    res.send(ourList);
});
app.post("/list-all-files", async (req, res) => {
    const ourList = await listAllFiles();
    res.send(ourList);
});

async function listFiles() {
    const list = await client.search({
        index: 'search-pdf-docs',
        "size": 15,
        "query": {
            "match_all": {}
        }

    });
    console.log(list.hits.hits)
    console.log("SIZE IS" + (list.hits.hits).length)
    return (list.hits.hits);
}

async function listAllFiles() {
    const list = await client.search({
        index: 'search-pdf-docs',
        "size": 300,
        "query": {
            "match_all": {}
        }

    });
    console.log(list.hits.hits)
    console.log("SIZE IS" + (list.hits.hits).length)
    return (list.hits.hits);
}

const uploadQueue = async.queue(async function (task, callback) {
    const { req } = task;
    console.log("called");
    if (!req.files || !req.files.pdfFile) {
        callback();
        return;
    }

    const curr = { "domain": "", "title": "", "data": "", "link": "google.com" };
    try {
        const result = await pdfParse(req.files.pdfFile);
        curr.title = req.files.pdfFile.name;
        curr.data = (JSON.stringify(result.text)).replaceAll(/\['"\]/g, '').replaceAll(/\\\\n/g, ' ');
        curr.domain = req.body.domain;
        const datarow = [curr];
        await index(datarow);
        callback();
    } catch (err) {
        console.error("Error parsing PDF:", err);
        callback(err);
    }
}, 1);

app.post("/extract-text", (req, res) => {
    uploadQueue.push({ req }, (err) => {
        if (err) {
            console.error("Error processing file:", err);
            res.status(500).send("Error Processing file");
        } else {
            res.status(200).send("File processed successfully");
        }
    });
});

app.post("/delete-file", async (req, res) => {
    const fileId = req.body.fileId;
    try {
        const { body: result } = await client.delete({
            index: 'search-pdf-docs',
            id: fileId
        });
        console.log("Document deleted:", result);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ success: false, error: "Error deleting document" });
    }
});

app.post("/delete-all", async (req, res) => {
    deleteall();
});

console.log("hello");
const list = [];

async function deleteall() {
    await client.indices.delete({ index: 'search-pdf-docs' });
    await client.indices.create({ index: 'search-pdf-docs' });
}

app.listen(9001);
module.exports = router;