require('dotenv/config');

import express from "express";
import cors from 'cors';
const app = express();

import { Telegraf } from "telegraf";
import { getMatches, getResults, createMessageMatches, createMessageResults } from './functions';

app.use(cors());

app.get('/send-message', (req, res) => {
  const telegram = new Telegraf(process.env.APP_TOKEN!).telegram;

  async function getMessage() {
    try {
      const matches = await getMatches();
      const results = await getResults();
      const messageMatches = await createMessageMatches(matches);
      const messageResults = await createMessageResults(results);
    
      await telegram.sendMessage(process.env.CHAT_ID!, messageResults);
      await telegram.sendMessage(process.env.CHAT_ID!, messageMatches);

      res.send('Mensagem enviada!');
    } catch (error) {
      console.log(error);
      await telegram.sendMessage(process.env.CHAT_ID!, 'Problemas técnicos!');
      res.send('Houve algum problema!!');
    }
  }

  getMessage();
})

app.get('/matches', (req, res) => {
  async function matches(){
    try {
      const matches = await getMatches();
      res.json(matches).send();
    } catch (error) {
      res.status(404).json({erro: 'Houve algum problema!!'});
    }
  } 

  matches();
})

app.get('/results', (req, res) => {
  async function results(){
    try {
      const results = await getResults();
      res.json(results).send();
    } catch (error) {
      res.status(404).json({erro: 'Houve algum problema!!'});
    }
  } 

  results();
})

app.listen(process.env.PORT || 3000, () => console.log('Server on'));
