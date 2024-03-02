const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const { Client } = require('@elastic/elasticsearch');

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


app.post("/extract-text", (req, res) => {
    if (!req.files && !req.files.pdfFile) {
        res.status(400);
        res.end();
    }
    const datarow = [];
    // console.log(req);
    const curr={"link": "google.com", "title": "", "data": ""};

    pdfParse(req.files.pdfFile).then(result => {
        curr.title = req.files.pdfFile.name; 
        curr.data = (JSON.stringify(result.text)).replaceAll(/['"]/g, '').replaceAll(/\\n/g, ' ') ;
        // console.log(curr.data);
        datarow.push(curr);
        // console.log(datarow);
        index(datarow);

        res.send(curr.data);
    });

});

app.listen(9001);


