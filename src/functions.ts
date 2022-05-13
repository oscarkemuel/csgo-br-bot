import HLTV, {  Match, FullMatchResult } from 'hltv';
import { flag } from 'country-emoji';
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

interface IMatchTemp extends Match{
  link?: string;
  flagTeam1: string | undefined; 
  flagTeam2: string | undefined;
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

function formatDate(date: string) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [year, month, day].join('-');
}

async function newLinkToMatche(matches: IMatchTemp[]){
  await Promise.all(matches.map(async (e) => {
    const mathLink = `${e.id}/${e.team1?.name}-vs-${e.team2?.name}-${e.event.name.toLowerCase().replace(' ', '-')}`;

    let url = `https://www.hltv.org/matches/${mathLink}`;
    
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
  let gamesPerTeam: IMatchTemp[] = [];
  
  const matches = await HLTV.getMatches();

  for await (const team of teams.teams) {
    const game = matches.filter((matche) => {
      return (matche.team1 !== undefined &&  matche.team1.id == team.id) || 
             (matche.team2 !== undefined &&  matche.team2.id == team.id)
    });

    if(game[0] !== undefined){
      const match = await HLTV.getMatch({ id: game[0].id });
      const matchComplete: IMatchTemp = { 
        ...match, 
        flagTeam1: await getFlag(match.team1?.id!),
        flagTeam2: await getFlag(match.team2?.id!)
       }
      gamesPerTeam.push(matchComplete);
    }
  }

  await newLinkToMatche(gamesPerTeam);

  gamesPerTeam.sort(function compare(a, b) {
    var dateA = a.date;
    var dateB = b.date;
    
    return dateA! - dateB!;
  });

  return gamesPerTeam;
}

export async function getResults() {
  let gamesPerTeam: FullMatchResult[] = [];
  const date = formatDate(new Date(new Date().getTime() - 24*60*60*1000).toLocaleString());
  console.log(date)

  const games = await HLTV.getResults({ teamIds: teams.teams.map(team => team.id), endDate: date, startDate: date });

  for (let i = 0; i < 8; i++) {
    if(games[i]) gamesPerTeam.push(games[i]);
  }

  // await newLinkToResult(gamesPerTeam);

  gamesPerTeam.sort(function compare(a, b) {
    var dateA = a.date;
    var dateB = b.date;
    
    return dateA! - dateB!;
  });

  return gamesPerTeam;
}

async function getFlag(id: number) {
  const team = await HLTV.getTeam({ id })

  return flag(team.country.code)
}

export async function createMessageMatches(matches: IMatchTemp[]){
  let message = '\nPRÓXIMOS JOGOS\n';

  if(matches.length < 1){
    message = message.concat('------------------------------------------------');
    message = message.concat('Sem partidas próximas');
  }else{
    await Promise.all(matches.map(async (matche) => {
      const dateNew = new Date(matche.date!);
      let date = dateNew.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
      if (date == new Date().toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"})){
        date = 'HOJE';
      }
  
      let time = dateNew.toLocaleTimeString("pt-BR", {timeZone: "America/Sao_Paulo"});
      time = time.substring(0, 5);
  
      message = message.concat('------------------------------------------------\n');
      const bodyMessage = `${matche.flagTeam1} ${matche.team1!.name} vs ${matche.team2!.name} ${matche.flagTeam2}\n${date} - ${time} - ${matche.format?.location}\n${matche.event.name} \n`;
      message = message.concat(bodyMessage);
      message = message.concat(`${matche.link}\n\n`);

      if(matche.streams.length > 0){
        message = message.concat(`Streams:\n`);

        for (let i = 0; i < 2; i++) {
          const stream = matche.streams[i];
          message = message.concat(`• ${stream.name}\n`);
        }
      }
      
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
