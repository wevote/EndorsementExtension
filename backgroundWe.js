const $ = window.$;
let weVoteNameMap = new Map();

// All the functions would be flagged without the following
/* eslint-disable no-unused-vars */

function getNamesFromApiServer(election) {
  let words = [];
  // http://localhost:8000/apis/v1/candidatesSyncOut/?google_civic_election_id=2000&endorsement_names=1&state_code=
  // TODO: route in the base api rul and election number
  const apiURL = encodeURI(`https://api.wevoteusa.org/apis/v1/candidateListForUpcomingElectionsRetrieve/?google_civic_election_id_list[]=${election}`);
  console.log(apiURL);
  $.getJSON(apiURL, '', (res) => {
    console.log("candidateListForUpcomingElectionsRetrieve API SUCCESS", res);
    let candidateList = res['candidate_list'];
    console.log("get json candidateList: ", candidateList);
    for( let k = 0; k < candidateList.length; k++) {
      let candidateDict = candidateList[k];
      const {name, we_vote_id: weVoteId, alternate_names: alternateNames } = candidateDict;
      if ( alternateNames ) {
        for( let n = 0; n < alternateNames.length; n++) {
          words.push(alternateNames[n]);
          weVoteNameMap.set(alternateNames[n], weVoteId);
        }
      }
      // console.log("NAME: ", name);
      words.push(name);
      weVoteNameMap.set(name, weVoteId);
    }
  }).fail((err) => {
    console.log('candidateListForUpcomingElectionsRetrieve API error', err);
  });

  return words;
}

function getOrganizationFound (locationHref, sendResponse) {
  let data = {};
  const hrefEncoded = encodeURIComponent(locationHref);
  const apiURL = `https://api.wevoteusa.org/apis/v1/voterGuidePossibilityRetrieve/?voter_device_id=${localStorage['voterDeviceId']}&url_to_scan=${hrefEncoded}`;
  console.log("STEVE STEVE voterGuidePossibilityRetrieve apiURL: " + apiURL);
  $.getJSON(apiURL, '', (res) => {
    console.log("voterGuidePossibilityRetrieve API SUCCESS", res);
    const { organization_email: email, organization_name: orgName, organization_twitter_handle: twitterHandle, organization_we_vote_id: weVoteId,
      organization_website: orgWebsite,
      we_vote_hosted_profile_image_url_medium: orgLogo } = res.organization;
    const { voter_guide_possibility_edit: possibilityUrl, voter_guide_possibility_id: possibilityId } = res;
    console.log("voterGuidePossibilityRetrieve logged in status: " + name);

    data = { email: email, orgName: orgName,  twitterHandle: twitterHandle, weVoteId: weVoteId,
      orgWebsite: orgWebsite, orgLogo: orgLogo, possibilityUrl: possibilityUrl, possibilityId: possibilityId };

    console.log("RIGHT BEFORE return data --------------: ", data);
    sendResponse({data: data});
  }).fail( function(d, textStatus, error) {
    console.error("getJSON voterGuidePossibilityRetrieve failed, status: " + textStatus + ", error: " + error);
  });
  return data;
}

function updateSignedInVoter() {
  let voterDeviceId = localStorage['voterDeviceId'];
  if (voterDeviceId && voterDeviceId.length > 0) {
    const apiURL = `https://api.wevoteusa.org/apis/v1/voterRetrieve/?voter_device_id=${voterDeviceId}`;
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
  }//https://api.wevoteusa.org/apis/v1/voterRetrieve/?voter_device_id=VbfiYGrnfUXouMWkjRzSMM2z0WhUYPSoIef0QD4gZKgxxcVhZRxy1IeTLNwlWJTaIGHhf0Yx6bse2ZqqkN8b8grW
}
