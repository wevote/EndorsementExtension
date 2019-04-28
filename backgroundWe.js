const $ = window.$;
let weVoteNameMap = new Map();

function getNamesFromApiServer(election) {
  let raw_results = '';
  let words = [];
  // http://localhost:8000/apis/v1/candidatesSyncOut/?google_civic_election_id=2000&endorsement_names=1&state_code=
  const apiURL = `http://localhost:8000/apis/v1/candidatesSyncOut/?google_civic_election_id=${election}&endorsement_names=1`;
  console.log(apiURL);
  $.getJSON(apiURL, 'Hello', (res) => {
    console.log("get json from API SUCCESS", res);
    for( let k = 0; k < res.length; k++) {
      let candidateDict = res[k];
      // Object.keys(candidateDict).forEach(function(key) {
      //   console.log(key, candidateDict[key]);
      // });
      words.push(candidateDict['candidate_name']);
      weVoteNameMap.set(candidateDict['we_vote_id'], candidateDict['candidate_name']);
    }

  }).fail((err) => {
    console.log('error', err);
  });
  return words;
}

function ctePanel(candidates, selector) {  // eslint-disable-line no-unused-vars
  if (candidates.length === 0) {
    candidates = demoCandidates;
  }
  for (let i = 0; i < candidates.length; i++) {
    candidatePane(i, candidates[i], selector);
  }
}
