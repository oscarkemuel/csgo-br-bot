import HLTV from 'hltv-api';
import tinyurl from 'tinyurl-api';
import teams from '../data.json';

interface ITeam {
  name: string;
  crest: string;
}

interface IMatche {
  id: number;
  link: string;
  time: string;
  event: {
    name: string;
    crest: string;
  };
  stars: number;
  map: string;
  teams: ITeam[];
}

interface ITeamResult extends ITeam {
  result: number;
}

interface IResult {
  event: string;
  maps: string;
  time: string;
  team1: ITeamResult;
  team2: ITeamResult;
  matchId: string;
}

async function newLinkToMatche(matches: IMatche[]){
  await Promise.all(matches.map(async (e) => {
    let url = `https://www.hltv.org${e.link}`;
    const newLink = await tinyurl(url);
    e.link = newLink;
  }))
}

async function newLinkToResult(matches: IResult[]){
  await Promise.all(matches.map(async (e) => {
    let url = `https://www.hltv.org${e.matchId}`;
    const newLink = await tinyurl(url);
    e.matchId = newLink;
  }))
}

export async function getMatches() {
  let gamesPerTeam: IMatche[] = [];
  
  const matches: IMatche[] = await HLTV.getMatches();
  teams.teams.forEach(team => {
    const game = matches.filter((matche) => {
      return matche.teams[0].name == team || matche.teams[1].name == team;
    });

    game[0] !== undefined && gamesPerTeam.push(game[0]);
  });

  await newLinkToMatche(gamesPerTeam);

  gamesPerTeam.sort(function compare(a, b) {
    var dateA = new Date(a.time);
    var dateB = new Date(b.time);
    
    return Math.abs(<any>dateA - <any>dateB);
  });

  return gamesPerTeam;
}

export async function getResults() {
  let gamesPerTeam: IResult[] = [];
  
  const matches: IResult[] = await HLTV.getResults();
  teams.teams.forEach(team => {
    const game = matches.filter((matche) => {
      return matche.team1.name == team || matche.team2.name == team;
    });

    game[0] !== undefined && gamesPerTeam.push(game[0]);
  });

  await newLinkToResult(gamesPerTeam);

  gamesPerTeam.sort(function compare(a, b) {
    var dateA = new Date(a.time);
    var dateB = new Date(b.time);
    
    return Math.abs(<any>dateA - <any>dateB);
  });

  return gamesPerTeam;
}

export async function createMessageMatches(matches: IMatche[]){
  let message = '\nPRÓXIMOS JOGOS\n';

  if(matches.length < 1){
    message = message.concat('------------------------------------------------');
    message = message.concat('Sem partidas pŕoximas');
  }else{
    await Promise.all(matches.map(async (matche) => {
      // format date
      const dateNew = new Date(matche.time);
      let date = dateNew.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
      if (date == new Date().toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"})){
        date = 'HOJE';
      }
  
      let time = dateNew.toLocaleTimeString("pt-BR", {timeZone: "America/Sao_Paulo"});
      time = time.substring(0, 5);
  
      message = message.concat('------------------------------------------------\n');
      const bodyMessage = `${matche.teams[0].name} vs ${matche.teams[1].name}\n${date} - ${time}\n${matche.event.name} \n`;
      message = message.concat(bodyMessage);
      message = message.concat(`${matche.link}\n`);
    }))
  }

  message = message.concat('------------------------------------------------');
  return message;
}

export async function createMessageResults(results: IResult[]){
  let message = '\nRESULTADOS\n';

  if(results.length < 1){
    message = message.concat('------------------------------------------------');
    message = message.concat('Sem resultados');
  }else{
    await Promise.all(results.map(async (result) => {
      // format date
      const dateNew = new Date(result.time);
      let date = dateNew.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});

      if(result.matchId){
        message = message.concat('------------------------------------------------\n');
        const bodyMessage = `${result.team1.name} ${result.team1.result} vs ${result.team2.result} ${result.team2.name} \n`;
        message = message.concat(bodyMessage);
        message = message.concat(`${result.event} - ${date}\n`);
        message = message.concat(`${result.matchId}\n`);
      }
    }))
  }

  message = message.concat('------------------------------------------------');
  return message;
}
