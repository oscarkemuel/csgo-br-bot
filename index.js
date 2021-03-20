require('dotenv/config');

const express = require('express');
const cors = require('cors');
const app = express();

const axios = require('axios').default
const data = require('./data.json');
const Telegram = require('telegraf').Telegram

app.use(cors())

function createMessage(matches){
  let message = '\nPRÓXIMOS JOGOS\n';
  message = message.concat('------------------------------------------------\n')
                  
  matches.map((matche) => {

    // format date
    let date = matche.date.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
    if (date == new Date().toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"})){
      date = 'HOJE'
    }

    // format start-time
    let time = matche.date.toLocaleTimeString("pt-BR", {timeZone: "America/Sao_Paulo"})
    time = time.substring(0, 5);

    if(matche.game){
      message = message.concat('------------------------------------------------')
      const bodyMessage = `\n${matche.name_1} vs ${matche.name_2}\n${date} - ${time}\n${matche.event} \n`;
      message = message.concat(bodyMessage)
    }else{
      message = message.concat(`${matche.message}\n`)
    }
  })

  message = message.concat('------------------------------------------------')
  return message;
}

async function getMatchesBR(team){
  try{
    const response = await axios.get('https://hltv-api.vercel.app/api/matches')
    const data = response.data
    const teamName = data.filter((matche) => (matche.teams[0].name == team || matche.teams[1].name == team))
    const matche = teamName[0];

    if (matche == undefined){
      const body = {
        game: false,
        message: `${team}: sem jogos previstos`,
        date: new Date()
      }
      return body;
    }

    const body = {
      game: true,
      event: matche.event.name,
      name_1: matche.teams[0].name,
      name_2: matche.teams[1].name,
      date: new Date(matche.time),
    }

    return body;
  } catch(err){
    console.log(err);
    return `error na requisição`;
  }
}

async function getMessage() {
  const teams = data.teams;
  const matches = [];

  const promises = teams.map(async (team) => {
    const matcheMessage = await getMatchesBR(team)
    matches.push(matcheMessage);
  })

  await Promise.all(promises);

  const sortedMatches = matches.slice().sort((a, b) => b.date - a.date).reverse();
  const message = createMessage(sortedMatches);

  const telegram = new Telegram(process.env.APP_TOKEN)
  telegram.sendMessage(process.env.CHAT_ID, message)
}

app.get('/send-message', (req, res) => {
  try {
    getMessage()
    res.send('Mensagem enviada!')
  } catch (error) {
    res.send('Houve algum problema!')
  }
})

app.listen(process.env.PORT || 3000, () => console.log('Server on'))