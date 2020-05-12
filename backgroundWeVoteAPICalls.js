const {$} = window;
const voterGuidePossibilityIdCache = {};  // we lose the current value when we reload in a iFrame, so cache it here
let debug = false;
let voterGuidePossibilityRetrieveT0 = 0;

// All the functions would be flagged without the following
/* eslint-disable no-unused-vars */
/* eslint no-undef: 0 */

function getHighlightsListFromApiServer (locationHref, doReHighlight, sendResponse, election) {
  console.log('getHighlightsListFromApiServer received election: ' + election);

  const hrefEncoded = encodeURIComponent(locationHref); //'https://www.emilyslist.org/pages/entry/state-and-local-candidates');
  const apiURL = `${rootApiURL}/voterGuidePossibilityHighlightsRetrieve/?voter_device_id=${localStorage['voterDeviceId']}&url_to_scan=${hrefEncoded}`;
  debug && console.log('getHighlightsListFromApiServer: ' + apiURL);
  const t1 = performance.now();

  $.getJSON(apiURL, '', (res) => {
    debug && console.log('voterGuideHighlightsRetrieve API SUCCESS', res);
    debug &&  console.log('------------------- voterGuideHighlightsRetrieve API SUCCESS apiURL: ' + apiURL);
    const t2 = performance.now();
    timingLog(t1, t2, 'voterGuideHighlightsRetrieve took', 8.0);
    processHighlightsRetrieve(res, doReHighlight, sendResponse);
  }).fail((err) => {
    console.log('voterGuideHighlightsRetrieve API error', err);
  });
}

function processHighlightsRetrieve (res, doReHighlight, sendResponse) {
  let highlightsList = res['highlight_list'];
  let neverHighLightOnLocal = res['never_highlight_on'];


  // February 2020, these are temporary and can be removed once the python server is updated
  neverHighLightOnLocal.push('about:blank');
  neverHighLightOnLocal.push('platform.twitter.com');
  neverHighLightOnLocal.push('s7.addthis.com');
  neverHighLightOnLocal.push('vars.hotjar.com');
  neverHighLightOnLocal.push('*.google.com');
  neverHighLightOnLocal.push('regex101.com');
  debug && console.log('get json highlightsList: ', highlightsList);
  debug && console.log('get json highlightsList.length: ', highlightsList.length);
  const t0 = performance.now();
  initializeHighlightsData(highlightsList, neverHighLightOnLocal);
  timingLog(t0, performance.now(), 'initializeHighlightsData took', 5.0);
  if (doReHighlight) {
    requestReHighlight();
  }
  sendResponse({
    success: res.success,
    highlights: highlightsList.length,
    nameToIdMap,
  });
}

function getOrganizationFound (locationHref, sendResponse) {
  let data = {};
  const hrefEncoded = encodeURIComponent(locationHref);
  const t0 = performance.now();
  const apiURL = `${rootApiURL}/voterGuidePossibilityRetrieve/?voter_device_id=${localStorage['voterDeviceId']}&url_to_scan=${hrefEncoded}`;
  console.log('voterGuidePossibilityRetrieve apiURL: ' + apiURL);
  $.getJSON(apiURL, '', (res) => {
    const t1 = performance.now();
    timingLog(t0, t1, 'voterGuidePossibilityRetrieve took', 8.0);
    debug && console.log('voterGuidePossibilityRetrieve API results', res);
    let {voter_guide_possibility_edit: voterGuidePossibilityEdit, possibilityUrl, voter_guide_possibility_id: voterGuidePossibilityId, organization,
      possible_owner_of_website_organizations_list: noExactMatchOrgList} = res;
    if (voterGuidePossibilityEdit) {
      let {
        organization_email: email, organization_name: orgName, organization_twitter_handle: twitterHandle, organization_we_vote_id: weVoteId,
        organization_website: orgWebsite,
        we_vote_hosted_profile_image_url_medium: orgLogo,
      } = organization;

      voterGuidePossibilityIdCache[locationHref] = voterGuidePossibilityId;
      debug && console.log('voter_guide_possibility_id:', voterGuidePossibilityId);

      for (let tabId in tabsHighlighted) {
        const { url } = tabsHighlighted[tabId];
        if (url === locationHref) {
          debug && console.log('^^^^^^^^ getOrganizationFound before:', tabId, tabsHighlighted[tabId]);
          data = Object.assign(tabsHighlighted[tabId], {
            highlighterEnabled,
            email,
            orgName,
            twitterHandle,
            weVoteId,
            orgWebsite,
            orgLogo,
            possibilityUrl,
            voterGuidePossibilityId,
            noExactMatchOrgList
          });
          debug && console.log('^^^^^^^^ getOrganizationFound after:', tabId, tabsHighlighted[tabId]);
          break;
        }
      }
    } else {
      console.log('ERROR: voterGuidePossibilityRetrieve returned with a undefined or null, res or res.organization');
      data = {};
    }
    sendResponse({data: data});
  }).fail(function (d, textStatus, error) {
    console.error(`getJSON voterGuidePossibilityRetrieve failed, status: ${textStatus}, error: ${error}`);
  });
  return data;
}

function getVoterSignInInfo (sendResponse) {
  let data = {};
  const { voterDeviceId } = localStorage;
  const apiURL = `${rootApiURL}/voterRetrieve/?voter_device_id=${voterDeviceId}`;
  console.log('getVoterSignInInfo apiURL: ' + apiURL);

  if (voterDeviceId && voterDeviceId.length > 0) {
    $.getJSON(apiURL, '', (res) => {
      debug && console.log('get json from getVoterSignInInfo voterRetrieve API SUCCESS', res);
      const {success, full_name: fullName, we_vote_id: weVoteId, voter_photo_url_medium: photoURL, is_signed_in: isSignedIn,
        signed_in_facebook: signedInFacebook, signed_in_google: signedInGoogle, signed_in_twitter: signedInTwitter, signed_in_with_email: signedInWithEmail } = res;
      data = {
        success,
        error:    success ? '' : res.status,
        fullName,
        photoURL,
        weVoteId,
        isSignedIn,
        signedInFacebook,
        signedInGoogle,
        signedInTwitter,
        signedInWithEmail
      };
      // console.log("get json from updateSignedInVoter photoURL" + photoURL);
      sendResponse({data: data});
    }).fail((err) => {
      data = {
        success: false,
        error: 'EXCEPTION',
        err: err,
      };
      console.log('getVoterSignInInfo error', err);
      sendResponse({data: data});
    });
  } else {
    console.log('NOT SIGNED IN ERROR in getVoterSignInInfo no voterDeviceId in local storage');
    data = {
      success: false,
      error: 'NOVOTERID',
    };
    sendResponse({data: data});
  }
}

function getPossiblePositions (voterGuidePossibilityId, hrefURL, isIFrame, sendResponse) {
  // https://api.wevoteusa.org/apis/v1/voterGuidePossibilityPositionsRetrieve/?voter_device_id=cYBPkwago&voter_guide_possibility_id=65
  if (debug && voterGuidePossibilityRetrieveT0 > 0) {
    timingLog(voterGuidePossibilityRetrieveT0, performance.now(), 'period between voterGuidePossibilityPositionsRetrieve calls ', 5.0);
  }
  const { voterDeviceId } = localStorage;
  if (voterDeviceId && voterDeviceId.length > 0) {
    let vGPId = voterGuidePossibilityId;
    if (!voterGuidePossibilityId || voterGuidePossibilityId === 0 || voterGuidePossibilityId === '' || voterGuidePossibilityId === 'undefined') {
      debug && console.log('getPossiblePositions called without a voterGuidePossibilityIdCache');
      vGPId = voterGuidePossibilityIdCache[hrefURL];
      if (!vGPId || vGPId.length === 0) {
        debug && console.log('No received or cached voterGuidePossibilityIdCache in getPossiblePositions for URL ', hrefURL);
      }
    }
    const apiURL = `${rootApiURL}/voterGuidePossibilityPositionsRetrieve/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${vGPId}`;
    debug && console.log('getPossiblePositions: ' + apiURL);
    $.getJSON(apiURL, '', (res) => {
      debug && console.log('get json from getPossiblePositions API returned ', res);

      const {possible_position_list: possiblePositions} = res;

      sendResponse({data: possiblePositions});
      voterGuidePossibilityRetrieveT0 = performance.now();
    }).fail((err) => {
      console.log('getPossiblePositions error', err);
    });
  }
}

function updatePossibleVoterGuide (voterGuidePossibilityId, orgName, orgTwitter, orgState, comments, sendResponse) {
  const { voterDeviceId } = localStorage;
  debug && console.log('updatePossibleVoterGuide voterGuidePossibilitySave voterGuidePossibilityId: ' + voterGuidePossibilityId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    const apiURL = `${rootApiURL}/voterGuidePossibilitySave/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${voterGuidePossibilityId}` +
      `&possible_organization_name=${encodeURIComponent(orgName ? orgName.trim() : '')}` +
      `&possible_organization_twitter_handle=${encodeURIComponent(orgTwitter ? orgTwitter.trim() : '')}` +
      `&contributor_comments=${encodeURIComponent(comments)}&limit_to_this_state_code=${orgState ? orgState.trim(): ''}`;
    debug && console.log('voterGuidePossibilitySave: ' + apiURL);
    $.getJSON(apiURL, '', (res) => {
      debug && console.log('get json from voterGuidePossibilitySave API SUCCESS', res);
      const { possible_organization_name: orgName, contributor_comments: comments } = res;
      let data = {
        orgName: orgName,
        comments: comments,
      };
      sendResponse({data: data});
    }).fail((err) => {
      console.log('updatePossibleVoterGuide error', err);
    });
  }
}

function voterGuidePossibilityPositionSave (itemName, voterGuidePossibilityId, voterGuidePossibilityPositionId, stance, statementText, moreInfoURL, removePosition, sendResponse) {
  //  Dale: 9/16/19
  //  Remove the voter_device_id and voter_guide_possibility_id
  //  Enter the "possibility_position_id" into the "voter_guide_possibility_position_id" field in the try it now form
  //  Do not send empty values on the url, since that might clear out good data on the Python side
  //  Steve: voter_guide_possibility_position_id completely specifies the possibility and nothing else is needed for the search/match
  const { voterDeviceId } = localStorage;
  console.log('voterGuidePossibilityPositionSave voterGuidePossibilityPositionId: ' + voterGuidePossibilityPositionId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    let apiURL = `${rootApiURL}/voterGuidePossibilityPositionSave/?voter_device_id=${voterDeviceId}` +
      `&voter_guide_possibility_id=${voterGuidePossibilityId}&voter_guide_possibility_position_id=${voterGuidePossibilityPositionId}` +
      `&position_stance=${stance}&possibility_should_be_deleted=${removePosition}`;
    if (!removePosition) {
      if (itemName.length > 0) {
        apiURL += `&ballot_item_name=${encodeURIComponent(itemName)}`;
      }
      if (statementText.length > 0) {
        apiURL += `&statement_text=${encodeURIComponent(statementText)}`;
      }
      if (moreInfoURL.length > 0) {
        apiURL += `&more_info_url=${encodeURIComponent(moreInfoURL)}`;
      }
    }
    debug && console.log('voterGuidePossibilityPositionSave: ' + apiURL);
    $.getJSON(apiURL, '', (res) => {
      debug && console.log('get json from voterGuidePossibilityPositionSave API SUCCESS', res);
      sendResponse({res});
    }).fail((err) => {
      console.log('voterGuidePossibilityPositionSave error', err);
    });
  }
}

// Save a possible voter guide
function voterGuidePossibilitySave (organizationWeVoteId, voterGuidePossibilityId, internalNotes, contributorEmail, sendResponse) {
  // eslint-disable-next-line prefer-destructuring
  let voterDeviceId = localStorage['voterDeviceId'];
  debug && console.log('voterGuidePossibilitySave (really the organization_we_vote_id) voterGuidePossibilityId: ' + voterGuidePossibilityId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    let apiURL = `${rootApiURL}/voterGuidePossibilitySave/?voter_device_id=${voterDeviceId}` +
      `&voter_guide_possibility_id=${voterGuidePossibilityId}&organization_we_vote_id=${organizationWeVoteId}&internal_notes=${encodeURIComponent(internalNotes)}&contributor_email=${contributorEmail}`;
    // debug &&
    console.log('voterGuidePossibilityPositionSave: ' + apiURL);
    $.getJSON(apiURL, '', (res) => {
      debug && console.log('get json from voterGuidePossibilitySave API SUCCESS', res);
      sendResponse({res});
    }).fail((err) => {
      console.log('voterGuidePossibilitySave error', err);
    });
  } else {
    let res = {
      success: false,
      message: 'Can not make ths api call unless you are logged in, and have a voterDeviceId',
    };
    sendResponse({res});
  }
}

function getCandidate (candidateWeVoteId, sendResponse) {
  // eslint-disable-next-line prefer-destructuring
  let voterDeviceId = localStorage['voterDeviceId'];
  /*debug &&*/ console.log('getCandidate for candidateWeVoteId: ' + candidateWeVoteId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    let apiURL = `${rootApiURL}/candidateRetrieve/?voter_device_id=${voterDeviceId}` +
      `&candidate_id=&candidate_we_vote_id=${candidateWeVoteId}`;
    // debug &&
    console.log('getCandidate: ' + apiURL);
    $.getJSON(apiURL, '', (res) => {
      debug && console.log('get json from getCandidate API SUCCESS', res);
      sendResponse({res});
    }).fail((err) => {
      console.log('getCandidate error', err);
    });
  } else {
    let res = {
      success: false,
      message: 'Can not make ths api call unless you are logged in, and have a voterDeviceId',
    };
    sendResponse({res});
  }
}

function convertPdfToHtmlInS3 (pdfURL, sendResponse) {
  debug && console.log('convertPdfToHtmlInS3: ' + pdfURL);
  // eslint-disable-next-line prefer-destructuring
  let voterDeviceId = localStorage['voterDeviceId'];

  if (voterDeviceId && voterDeviceId.length > 0) {
    let apiURL = `${rootApiURL}/pdfToHtmlRetrieve/?voter_device_id=${voterDeviceId}&pdf_url=${pdfURL}`;
    // let apiURL = `${rootApiURL}/pdfToHtmlRetrieve?voter_device_id=${voterDeviceId}&pdf_url=${pdfURL}`;
    // debug && console.log('convertPdfToHtmlInS3: ' + apiURL);
    $.getJSON(apiURL, '', (res) => {
      debug && console.log('get json from convertPdfToHtmlInS3 API SUCCESS', res);
      sendResponse({res});
    }).fail((err) => {
      console.log('convertPdfToHtmlInS3 error', err);
    });
  } else {
    let res = {
      success: false,
      message: 'Can not make ths api call unless you are logged in, and have a voterDeviceId',
    };
    sendResponse({res});
  }
}
