const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require("body-parser");
const async = require('async');
require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq((api_key = process.env.GROQ_API_KEY));

async function findDomainUsingLLM(title) {
    console.log("Calling the Groq API");
    const prompt = `Article Title: "${title}" Based on the above Title, Simply write which of the following domains is it most likely to fall in 
    ""Mathematics", "Life Sciences", "Computer Science", "Physics", "Medicine and Healthcare", "Environmental Science", "Engineering", "Social Sciences", "Education", "Defense""
    Simply return the name of the domain and nothing else`;

    const completion = await groq.chat.completions
        .create({
            messages: [{ role: "user", content: prompt }],
            model: "mixtral-8x7b-32768",
        })
        .then((chatCompletion) => {
            const fields = [
                "Mathematics",
                "Life Sciences",
                "Computer Science",
                "Physics",
                "Medicine and Healthcare",
                "Environmental Science",
                "Engineering",
                "Social Sciences",
                "Education",
                "Defense"
            ];
            const curr = chatCompletion.choices[0]?.message?.content || "";
            for (let field of fields) {
                if (curr.toLowerCase().includes(field.toLowerCase())) {
                    return field;
                }
            }

            // return "No matching field found";

            return chatCompletion.choices[0]?.message?.content || "";
        });

    return completion;
}

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

console.log("Started Upload Server");

const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const projectId = process.env.PROJECT_ID;
const keyFilename = process.env.KEYFILENAME;
const storage = new Storage({ projectId, keyFilename });

async function uploadPDF(file) {
    try {
        const bucketName = process.env.BUCKET_NAME;
        const bucket = storage.bucket(bucketName);
        const fileExtension = file.name.split('.').pop();
        const fileOutputName = `${Date.now()}.${fileExtension}`;
        const filePath = "./Dummy PDFs/" + file.name
        const ret = await bucket.upload(filePath, { destination: fileOutputName });
        console.log(`File uploaded to ${ret[0].metadata.mediaLink}`);
        const link = "https://storage.googleapis.com/" + process.env.BUCKET_NAME + "/" + fileOutputName;
        console.log(link);
        return link;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

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

const uploadQueue = async.queue(async function (task) {
    const { req } = task;
    console.log("called");
    if (!req.files || !req.files.pdfFile) {
        return;
    }

    const curr = { "domain": "", "title": "", "data": "", "link": "google.com" };
    try {
        const result = await pdfParse(req.files.pdfFile);
        curr.title = req.files.pdfFile.name;
        curr.data = (JSON.stringify(result.text)).replaceAll(/\['"\]/g, '').replaceAll(/\\\\n/g, ' ');
        curr.domain = req.body.domain;
        if (curr.domain == "auto") {
            curr.domain = await findDomainUsingLLM(curr.title);
        }
        curr.link = await uploadPDF(req.files.pdfFile); // Call the uploadPDF function here
        const datarow = [curr];
        await index(datarow);
    } catch (err) {
        console.error("Error parsing PDF:", err);
    }
}, 1);

app.post("/extract-text", (req, res) => {
    console.log(req.files.pdfFile)
    uploadQueue.push({ req }, (err) => {
        if (err) {
            console.error("Error processing file:", err);
            res.status(500).send("Error Processing file");
        } else {
            res.status(200).send("File processed successfully");
        }
    });
});


async function deleteall() {
    await client.indices.delete({ index: 'search-pdf-docs' });
    await client.indices.create({ index: 'search-pdf-docs' });
}

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
    // console.log(list.hits.hits)
    console.log("Retuned " + (list.hits.hits).length + " files for preview")
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
app.listen(9001);
module.exports = router;