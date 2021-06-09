require('dotenv/config');

const express = require('express');
const cors = require('cors');
const app = express();

const TinyURL = require('tinyurl');

const axios = require('axios').default
const teams = require('./data.json');
const Telegram = require('telegraf').Telegram

app.use(cors())

async function getResults(){
  let results = [];
  const response = await axios.get('https://hltv-api.vercel.app/api/results.json')
  const data = response.data
  // console.log(data);

  teams.teams.forEach(team => {
    const games = data.filter((e) => e.team1.name == team || e.team2.name == team)
    const noGame = {
      message: `${team}: sem resultados antecedentes`,
      time: new Date
    }
    games.length > 0 ? results.push(games[0]) : null
  });

  async function returnNewLink(url){
    let newLink;
    await TinyURL.shorten(`${url}`).then(function(res) { newLink = res })
    return newLink;
  }

  async function newLink(){
    await Promise.all(results.map(async (e) => {
      if(e.matchId){
        url = `https://www.hltv.org${e.matchId}`
        const newLink = await returnNewLink(url)
        e.matchId = newLink
      }
    }))
  }

  await newLink()

  results.sort(function compare(a, b) {
    var dateA = new Date(a.time);
    var dateB = new Date(b.time);
    return dateA - dateB;
  });

  return results;
}

async function getMatches(){
  let matches = [];
  const response = await axios.get('https://hltv-api.vercel.app/api/matches.json')
  const data = response.data

  teams.teams.forEach(team => {
    const games = data.filter((e) => e.teams[0].name == team || e.teams[1].name == team)
    const noGame = {
      message: `${team}: sem jogos próximos`,
      time: new Date
    }
    games.length > 0 ? matches.push(games[0]) : matches.push(noGame)
  });

  async function returnNewLink(url){
    let newLink;
    await TinyURL.shorten(`${url}`).then(function(res) { newLink = res })
    return newLink;
  }

  async function newLink(){
    await Promise.all(matches.map(async (e) => {
      if(e.id){
        url = `https://www.hltv.org${e.link}`
        const newLink = await returnNewLink(url)
        e.link = newLink
      }
    }))
  }

  await newLink()

  matches.sort(function compare(a, b) {
    var dateA = new Date(a.time);
    var dateB = new Date(b.time);
    return dateA - dateB;
  });

  return matches;
}

app.get('/send-message', (req, res) => {
  async function createMessageMatches(matches){
    let message = '\nPRÓXIMOS JOGOS\n';
    message = message.concat('------------------------------------------------\n')
                    
    await Promise.all(matches.map(async (matche) => {
      // format date
      const dateNew = new Date(matche.time)
      let date = dateNew.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
      if (date == new Date().toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"})){
        date = 'HOJE'
      }
  
      // // format start-time
      let time = dateNew.toLocaleTimeString("pt-BR", {timeZone: "America/Sao_Paulo"})
      time = time.substring(0, 5);

      if(matche.id){
        message = message.concat('------------------------------------------------\n')
        const bodyMessage = `${matche.teams[0].name} vs ${matche.teams[1].name}\n${date} - ${time}\n${matche.event.name} \n`;
        message = message.concat(bodyMessage)
        message = message.concat(`${matche.link}\n`)
      }else{
        message = message.concat(`${matche.message}\n`)
      }
    }))
  
    message = message.concat('------------------------------------------------')
    return message;
  }

  async function createMessageResults(results){
    let message = '\nRESULTADOS\n';

    if(results.length < 1){
      message = message.concat('------------------------------------------------')
      message = message.concat('Sem resultados')
    }else{
      await Promise.all(results.map(async (result) => {
        // format date
        const dateNew = new Date(result.time)
        let date = dateNew.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
  
        if(result.matchId){
          message = message.concat('------------------------------------------------\n')
          const bodyMessage = `${result.team1.name} ${result.team1.result} vs ${result.team2.result} ${result.team2.name} \n`;
          message = message.concat(bodyMessage)
          message = message.concat(`${result.event} - ${date}\n`)
          message = message.concat(`${result.matchId}\n`)
        }
      }))
    }
  
    message = message.concat('------------------------------------------------')
    return message;
  }
  
  async function getMessage() {
    try {
      const matches = await getMatches();
      const results = await getResults();
      const messageMatches = await createMessageMatches(matches);
      const messageResults = await createMessageResults(results);
    
      const telegram = new Telegram(process.env.APP_TOKEN)
      await telegram.sendMessage(process.env.CHAT_ID, messageResults)
      telegram.sendMessage(process.env.CHAT_ID, messageMatches)

      // console.log(messageMatches)
      // console.log(messageResults)
      res.send('Mensagem enviada!')
    } catch (error) {
      console.log(error);
      const telegram = new Telegram(process.env.APP_TOKEN)
      await telegram.sendMessage(process.env.CHAT_ID, 'Problemas técnicos!')
      res.send('Houve algum problema!!')
    }
  }

  getMessage()
})

app.listen(process.env.PORT || 3000, () => console.log('Server on'))
