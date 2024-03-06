const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require("body-parser");

const client = new Client({
    node: 'https://860fff9adba14721ba4c7834874e2cbf.us-central1.gcp.cloud.es.io:443',
    auth: {
        apiKey: 'N19YNy1ZMEJKRnRuLVVZcmVJckk6ZGtMQmM4Y0JTdy1Ob2NnNW9LemUzUQ=='
    }
});

var cors=require('cors');
const app = express();
const resp =  client.info();
const router = express.Router();
app.use(bodyParser.json());

app.use("/", express.static("public"));
app.use(fileUpload());

async function index(data)
{
    console.log(data)
      const result = await client.helpers.bulk({
        datasource: data,
        pipeline: "ent-search-generic-ingestion",
        onDocument: (doc) => ({ index: { _index: 'search-pdf-docs' }}),
      });
      console.log("Hi")
    console.log(result);
}
app.post("/list-files", async (req, res) => {
    // console.log("called");
    const ourList = await listFiles();
    res.send(ourList);
});
async function listFiles() {
    const list  = await client.search({
        index: 'search-pdf-docs',
    });
    // console.log(list.hits.hits) 
    return (list.hits.hits);
}

app.post("/extract-text", (req, res) => {
    console.log("called");

    if (!req.files && !req.files.pdfFile) {
        res.status(400);
        res.end();
    }
    const datarow = [];
    const curr={"link": "google.com", "title": "", "data": ""};
    pdfParse(req.files.pdfFile).then(result => {
        curr.title = req.files.pdfFile.name; 
        curr.data = (JSON.stringify(result.text)).replaceAll(/['"]/g, '').replaceAll(/\\n/g, ' ') ;
        datarow.push(curr);
        index(datarow);
        res.send(curr.data);
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
    deleteall()

});
console.log("hello")
const list=[];


async function deleteall() {
    await client.indices.delete({ index: 'search-pdf-docs' })
    await client.indices.create({ index: 'search-pdf-docs' })

}

// deleteall()
app.listen(9001);


