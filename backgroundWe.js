const $ = window.$;
let weVoteNameMap = new Map();

function getNamesFromApiServer(election) {  // eslint-disable-line no-unused-vars
  let words = [];
  // http://localhost:8000/apis/v1/candidatesSyncOut/?google_civic_election_id=2000&endorsement_names=1&state_code=
  const apiURL = `https://api.wevoteusa.org/apis/v1/candidateListForUpcomingElectionsRetrieve/&google_civic_election_id_list=${election}`;
  console.log(apiURL);
  $.getJSON(apiURL, '', (res) => {
    console.log("get json from API SUCCESS", res);
    let candidateList = res['candidate_list'];
    console.log("get json candidateList: ", candidateList);
    for( let k = 0; k < candidateList.length; k++) {
      let candidateDict = candidateList[k];
      // console.log("NAME: ", candidateDict['name']);
      words.push(candidateDict['name']);
      weVoteNameMap.set(candidateDict['we_vote_id'], candidateDict['name']);
    }

  }).fail((err) => {
    console.log('error', err);
  });
  return words;
}

// function ctePanel(candidates, selector) {  // eslint-disable-line no-unused-vars
//   if (candidates.length === 0) {
//     candidates = demoCandidates;
//   }
//   for (let i = 0; i < candidates.length; i++) {
//     candidatePane(i, candidates[i], selector);
//   }
// }