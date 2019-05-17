const $ = window.$;
const useProductionAPIs = true;
const rootApiURL = useProductionAPIs ? 'https://api.wevoteusa.org/apis/v1' : 'http://127.0.0.1:8000/apis/v1';
let weVoteNameMap = new Map();

// All the functions would be flagged without the following
/* eslint-disable no-unused-vars */
/* eslint no-undef: 0 */

function getNamesFromApiServer(initializeHighlightsData, election) {
  let wordsFromServer = [];

  const apiURL = `${rootApiURL}/candidateListForUpcomingElectionsRetrieve/?google_civic_election_id_list[]=${election}`;
  console.log("getNamesFromApiServer: " + apiURL);
  $.getJSON(apiURL, '', (res) => {
    console.log("candidateListForUpcomingElectionsRetrieve API SUCCESS", res);
    let candidateList = res['candidate_list'];
    console.log("get json candidateList: ", candidateList);
    for( let k = 0; k < candidateList.length; k++) {
      let candidateDict = candidateList[k];
      const {name, we_vote_id: weVoteId, alternate_names: alternateNames } = candidateDict;
      if ( alternateNames ) {
        for( let n = 0; n < alternateNames.length; n++) {
          wordsFromServer.push(alternateNames[n]);
          weVoteNameMap.set(alternateNames[n], weVoteId);
        }
      }
      // console.log("NAME: ", name);
      wordsFromServer.push(name);
      weVoteNameMap.set(name, weVoteId);
      initializeHighlightsData(wordsFromServer);
    }
  }).fail((err) => {
    console.log('candidateListForUpcomingElectionsRetrieve API error', err);
  });
}

function getOrganizationFound (locationHref, sendResponse) {
  let data = {};
  const hrefEncoded = encodeURIComponent(locationHref);
  const apiURL = `${rootApiURL}/voterGuidePossibilityRetrieve/?voter_device_id=${localStorage['voterDeviceId']}&url_to_scan=${hrefEncoded}`;
  console.log("STEVE STEVE voterGuidePossibilityRetrieve apiURL: " + apiURL);
  $.getJSON(apiURL, '', (res) => {
    console.log("voterGuidePossibilityRetrieve API results", res);
    if (res && res.organization) {
      const {
        organization_email: email, organization_name: orgName, organization_twitter_handle: twitterHandle, organization_we_vote_id: weVoteId,
        organization_website: orgWebsite,
        we_vote_hosted_profile_image_url_medium: orgLogo
      } = res.organization;
      const {voter_guide_possibility_edit: possibilityUrl, voter_guide_possibility_id: possibilityId} = res;

      console.log("STEVE STEVE voter_guide_possibility_id:", possibilityId);

      data = {
        email: email,
        orgName: orgName,
        twitterHandle: twitterHandle,
        weVoteId: weVoteId,
        orgWebsite: orgWebsite,
        orgLogo: orgLogo,
        possibilityUrl: possibilityUrl,
        possibilityId: possibilityId
      };
    } else {
      console.log("ERROR: voterGuidePossibilityRetrieve returned with a undefined or null, res or res.organization");
      data = {};
    }
    sendResponse({data: data});
  }).fail( function(d, textStatus, error) {
    console.error("getJSON voterGuidePossibilityRetrieve failed, status: " + textStatus + ", error: " + error);
  });
  return data;
}

function updateSignedInVoter() {
  let voterDeviceId = localStorage['voterDeviceId'];
  if (voterDeviceId && voterDeviceId.length > 0) {
    const apiURL = `${rootApiURL}/voterRetrieve/?voter_device_id=${voterDeviceId}`;
    console.log("STEVE voterRetrieve: " + apiURL);
    $.getJSON(apiURL, '', (res) => {
      console.log("get json from updateSignedInVoter API SUCCESS", res);
      const {full_name: fullName, we_vote_id: weVoteId, voter_photo_url_medium: photoURL } = res;
      window.voterName = fullName;
      window.voterPhotoURL = photoURL;
      window.voterWeVoteId = weVoteId;
    }).fail((err) => {
      console.log('updateSignedInVoter error', err);
    });
  }
}

function getPossiblePositions(possibilityId, sendResponse) {
  // https://api.wevoteusa.org/apis/v1/voterGuidePossibilityPositionsRetrieve/?voter_device_id=cYBPkwago&voter_guide_possibility_id=65
  let voterDeviceId = localStorage['voterDeviceId'];
  if (voterDeviceId && voterDeviceId.length > 0) {
    const apiURL = `${rootApiURL}/voterGuidePossibilityPositionsRetrieve/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${possibilityId}`;
    console.log("STEVE getPossiblePositions: " + apiURL);
    $.getJSON(apiURL, '', (res) => {
      console.log("get json from getPossiblePositions API SUCCESS", res);

      const {possible_position_list: possiblePositions} = res;

      sendResponse({data: possiblePositions});

    }).fail((err) => {
      console.log('getPossiblePositions error', err);
    });
  }
}
