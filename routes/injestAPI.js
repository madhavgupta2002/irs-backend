const { Client } = require('@elastic/elasticsearch');
const express = require("express");
var cors=require('cors');
const resp =  client.info();

const router = express.Router();
const client = new Client({
    node: 'https://860fff9adba14721ba4c7834874e2cbf.us-central1.gcp.cloud.es.io:443',
    auth: {
        apiKey: 'N19YNy1ZMEJKRnRuLVVZcmVJckk6ZGtMQmM4Y0JTdy1Ob2NnNW9LemUzUQ=='
    }
});

async function parse(){
    index()
}

async function index()
{
    const dataa = [
      {"link": "https://arxiv.org/pdf/2402.19080.pdf", "title": "Deep Learning in Financial Forecasting.pdf", "data": "financial forecasting"}
    ];
      const result = await client.helpers.bulk({
        datasource: dataa,
        pipeline: "ent-search-generic-ingestion",
        onDocument: (doc) => ({ index: { _index: 'search-pdf-docs' }}),
      });
      console.log("Hi")
    console.log(result);
}


