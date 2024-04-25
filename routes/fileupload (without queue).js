const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require("body-parser");
const client = new Client({
    node: 'https://197566baa3084a29a18f60154f5a9fe9.us-central1.gcp.cloud.es.io:443',
    auth: {
        apiKey: 'SUNVRUM0OEJuWlBCWTNsYWRPc086UVhPckY1a2lUWnV0bzlaZUprYVh3dw=='
    }
});
const cors = require('cors');
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
        onDocument: (doc) => ({
            index: { _index: 'search-pdf-docs' }
        }),
    });
    console.log("Hi");
    console.log(result);
}

app.post("/list-files", async (req, res) => {
    const ourList = await listFiles();
    res.send(ourList);
});

async function listFiles() {
    const list = await client.search({ index: 'search-pdf-docs' });
    return list.hits.hits;
}

app.post("/extract-text", (req, res) => {
    console.log("called");
    if (!req.files && !req.files.pdfFile) {
        res.status(400);
        res.end();
    }
    const datarow = [];
    const curr = { "domain": "", "title": "", "data": "", "link": "google.com" };
    pdfParse(req.files.pdfFile).then(result => {
        curr.title = req.files.pdfFile.name;
        curr.data = (JSON.stringify(result.text)).replaceAll(/['"]/g, '').replaceAll(/\\n/g, ' ');
        curr.domain = req.body.domain;
        datarow.push(curr);
        index(datarow);
        res.send(curr.data);
    });
});

app.post("/delete-file", async (req, res) => {
    const fileId = req.body.fileId;
    try {
        const { body: result } = await client.delete({ index: 'search-pdf-docs', id: fileId });
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

async function deleteall() {
    await client.indices.delete({ index: 'search-pdf-docs' });
    await client.indices.create({ index: 'search-pdf-docs' });
}

app.listen(9001);
module.exports = router;
