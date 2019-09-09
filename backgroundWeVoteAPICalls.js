const $ = window.$;
const useProductionAPIs = false;
const rootApiURL = useProductionAPIs ? 'https://api.wevoteusa.org/apis/v1' : 'http://127.0.0.1:8000/apis/v1';
let debug = false;

// All the functions would be flagged without the following
/* eslint-disable no-unused-vars */
/* eslint no-undef: 0 */

function getHighlightsListFromApiServer(locationHref, sendResponse, initializeHighlightsData, election) {
  console.log("getHighlightsListFromApiServer received election: " + election);

  const hrefEncoded = encodeURIComponent(locationHref); //'https://www.emilyslist.org/pages/entry/state-and-local-candidates');
  const apiURL = `${rootApiURL}/voterGuideHighlightsRetrieve?voter_device_id=${localStorage['voterDeviceId']}&url_to_scan=${hrefEncoded}`;
  debug&&console.log("getHighlightsListFromApiServer: " + apiURL);
  $.getJSON(apiURL, '', (res) => {
    debug&&console.log("voterGuideHighlightsRetrieve API SUCCESS", res);
    let highlightsList = res['highlights'];
    debug&&console.log("get json highlightsList: ", highlightsList);
    initializeHighlightsData(highlightsList);
  }).fail((err) => {
    console.log('voterGuideHighlightsRetrieve API error', err);
  });
}

function getOrganizationFound (locationHref, sendResponse) {
  let data = {};
  const hrefEncoded = encodeURIComponent(locationHref);
  const apiURL = `${rootApiURL}/voterGuidePossibilityRetrieve/?voter_device_id=${localStorage['voterDeviceId']}&url_to_scan=${hrefEncoded}`;
  console.log("voterGuidePossibilityRetrieve apiURL: " + apiURL);
  $.getJSON(apiURL, '', (res) => {
    console.log("voterGuidePossibilityRetrieve API results", res);
    if (res && res.voter_guide_possibility_edit) {
      let {
        organization_email: email, organization_name: orgName, organization_twitter_handle: twitterHandle, organization_we_vote_id: weVoteId,
        organization_website: orgWebsite,
        we_vote_hosted_profile_image_url_medium: orgLogo
      } = res.organization;
      let {voter_guide_possibility_edit: possibilityUrl, voter_guide_possibility_id: possibilityId} = res;

      debug&&console.log("voter_guide_possibility_id:", possibilityId);

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

function getVoterSignInInfo (sendResponse) {
  let data = {};
  let voterDeviceId = localStorage['voterDeviceId'];
  const apiURL = `${rootApiURL}/voterRetrieve/?voter_device_id=${voterDeviceId}`;
  console.log("getVoterSignInInfo apiURL: " + apiURL);

  if (voterDeviceId && voterDeviceId.length > 0) {
    $.getJSON(apiURL, '', (res) => {
      debug&&console.log("get json from getVoterSignInInfo voterRetrieve API SUCCESS", res);
      const {success, full_name: fullName, we_vote_id: weVoteId, voter_photo_url_medium: photoURL } = res;
      data = {
        success:  success,
        error:    success ? '' : res.status,
        fullName: fullName,
        photoURL: photoURL,
        weVoteId: weVoteId,
      };
      // console.log("get json from updateSignedInVoter photoURL" + photoURL);
      sendResponse({data: data});
    }).fail((err) => {
      data = {
        success: false,
        error: "EXCEPTION",
        err: err,
      };
      console.log('getVoterSignInInfo error', err);
      sendResponse({data: data});
    });
  } else {
    console.log("NOT SIGNED IN ERROR in getVoterSignInInfo no voterDeviceId in local storage");
    data = {
      success: false,
      error: "NOVOTERID",
    };
    sendResponse({data: data});
  }
}

function getPossiblePositions(possibilityId, sendResponse) {
  // https://api.wevoteusa.org/apis/v1/voterGuidePossibilityPositionsRetrieve/?voter_device_id=cYBPkwago&voter_guide_possibility_id=65
  let voterDeviceId = localStorage['voterDeviceId'];
  if (voterDeviceId && voterDeviceId.length > 0) {
    const apiURL = `${rootApiURL}/voterGuidePossibilityPositionsRetrieve/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${possibilityId}`;
    debug&&console.log("getPossiblePositions: " + apiURL);
    $.getJSON(apiURL, '', (res) => {
      console.log("get json from getPossiblePositions API SUCCESS", res);

      const {possible_position_list: possiblePositions} = res;

      sendResponse({data: possiblePositions});

    }).fail((err) => {
      console.log('getPossiblePositions error', err);
    });
  }
}

function updatePossibleVoterGuide(voterGuidePossibilityId, orgName, orgTwitter, orgState, comments, sendResponse) {
  let voterDeviceId = localStorage['voterDeviceId'];
  debug&&console.log("updatePossibleVoterGuide voterGuidePossibilitySave voterGuidePossibilityId: " + voterGuidePossibilityId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    const apiURL = `${rootApiURL}/voterGuidePossibilitySave/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${voterGuidePossibilityId}` +
      `&possible_organization_name=${encodeURIComponent(orgName ? orgName.trim() : '')}` +
      `&possible_organization_twitter_handle=${encodeURIComponent(orgTwitter ? orgTwitter.trim() : '')}` +
      `&contributor_comments=${encodeURIComponent(comments)}&limit_to_this_state_code=${orgState ? orgState.trim(): ''}`;
    debug&&console.log("voterGuidePossibilitySave: " + apiURL);
    $.getJSON(apiURL, '', (res) => {
      debug&&console.log("get json from voterGuidePossibilitySave API SUCCESS", res);
      const { possible_organization_name: orgName, contributor_comments: comments } = res;
      data = {
        orgName: orgName,
        comments: comments,
      };
      sendResponse({data: data});
    }).fail((err) => {
      console.log('updatePossibleVoterGuide error', err);
    });
  }
}
