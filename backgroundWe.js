const $ = window.$;
let weVoteNameMap = new Map();

function getNamesFromApiServer(election) {  // eslint-disable-line no-unused-vars
  let words = [];
  // http://localhost:8000/apis/v1/candidatesSyncOut/?google_civic_election_id=2000&endorsement_names=1&state_code=
  // TODO: route in the base api rul and election number
  const apiURL = `https://api.wevoteusa.org/apis/v1/candidateListForUpcomingElectionsRetrieve/&google_civic_election_id_list=${election}`;
  console.log(apiURL);
  $.getJSON(apiURL, '', (res) => {
    console.log("get json from API SUCCESS", res);
    let candidateList = res['candidate_list'];
    console.log("get json candidateList: ", candidateList);
    for( let k = 0; k < candidateList.length; k++) {
      let candidateDict = candidateList[k];
      const {name, we_vote_id: weVoteId, alternate_names: alternateNames } = candidateDict;
      if ( alternateNames ) {
        for( let n = 0; n < alternateNames.length; n++) {
          words.push(alternateNames[n]);
          weVoteNameMap.set(weVoteId, alternateNames[n]);
        }
      }
      // console.log("NAME: ", name);
      words.push(name);
      weVoteNameMap.set(weVoteId, name);
    }
  }).fail((err) => {
    console.log('error', err);
  });

  return words;
}