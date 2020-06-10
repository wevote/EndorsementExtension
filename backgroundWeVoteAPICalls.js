const {$} = window;
const voterGuidePossibilityIdCache = {};  // we lose the current value when we reload in a iFrame, so cache it here
let debugBackground = false;
let voterGuidePossibilityPositionsRetrieveT0 = 0;

// All the functions would be flagged without the following
/* eslint-disable no-unused-vars */
/* eslint no-undef: 0 */

function getHighlightsListsFromApiServer (locationHref, doReHighlight, sendResponse, showVoterGuideHighlights, showCandidateOptionsHighlights) {
  const getHighlightsListsFromApiServerDebug = true;
  const timingLogDebug = false;
  console.log('ENTERING backgroundWeVoteAPICalls > getHighlightsListsFromApiServer, showVoterGuideHighlights:', showVoterGuideHighlights, ', showCandidateOptionsHighlights:', showCandidateOptionsHighlights);
  if (!showVoterGuideHighlights && !showCandidateOptionsHighlights) {
    console.log('EXITING getHighlightsListsFromApiServer without highlighting');
  }

  const hrefEncoded = encodeURIComponent(locationHref); //'https://www.emilyslist.org/pages/entry/state-and-local-candidates');
  const ballotItemHighlightsRetrieve = `${rootCdnURL}/ballotItemHighlightsRetrieve/`; // Use CDN
  const voterGuidePossibilityHighlightsRetrieve = `${rootApiURL}/voterGuidePossibilityHighlightsRetrieve/?voter_device_id=${localStorage['voterDeviceId']}&limit_to_existing=true&url_to_scan=${hrefEncoded}`;
  debugBackground && console.log('ballotItemHighlightsRetrieve: ' + ballotItemHighlightsRetrieve);

  const t1 = performance.now();
  if (showVoterGuideHighlights && showCandidateOptionsHighlights) {
    // Get the entries already found from page scan
    $.getJSON(voterGuidePossibilityHighlightsRetrieve, '', (voterGuidePossibilityHighlightsRetrieveResponse) => {
      (debugBackground || getHighlightsListsFromApiServerDebug) && console.log('ENTERING COMBINED backgroundWeVoteAPICalls > voterGuidePossibilityHighlightsRetrieve API results received');
      debugBackground &&  console.log('------------------- voterGuidePossibilityHighlightsRetrieve API SUCCESS voterGuidePossibilityHighlightsRetrieve: ' + voterGuidePossibilityHighlightsRetrieve);
      const t2 = performance.now();
      timingLogDebug && timingLog(t1, t2, 'voterGuidePossibilityHighlightsRetrieve API retrieve took', 8.0);

      // Get all candidates in this years elections
      const t3 = performance.now();
      // $.ajaxSetup({ cache: true});  // Use the cache for this data
      $.getJSON(ballotItemHighlightsRetrieve, '', (ballotItemHighlightsRetrieveResponse) => {
        debugBackground && console.log('ballotItemHighlightsRetrieve API SUCCESS', ballotItemHighlightsRetrieveResponse);
        debugBackground && console.log('------------------- ballotItemHighlightsRetrieve API SUCCESS: ' + ballotItemHighlightsRetrieve);
        const t4 = performance.now();
        timingLogDebug && timingLog(t3, t4, 'ballotItemHighlightsRetrieve retrieve took', 8.0);

        const t5 = performance.now();
        processHighlightsRetrieve(ballotItemHighlightsRetrieveResponse, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse);
        const t6 = performance.now();
        timingLogDebug && timingLog(t5, t6, 'processHighlightsRetrieve end-to-end took', 8.0);
      }).fail((err) => {
        console.log('ballotItemHighlightsRetrieve API error', err);
      });
    }).fail((err) => {
      console.log('voterGuidePossibilityHighlightsRetrieve API error', err);
    });
  } else if (showVoterGuideHighlights) {
    // Get the entries already found from page scan
    $.getJSON(voterGuidePossibilityHighlightsRetrieve, '', (voterGuidePossibilityHighlightsRetrieveResponse) => {
      (debugBackground || getHighlightsListsFromApiServerDebug) && console.log('ENTERING showVOTERGUIDEHighlights backgroundWeVoteAPICalls > voterGuidePossibilityHighlightsRetrieve API results received.');
      debugBackground &&  console.log('------------------- voterGuidePossibilityHighlightsRetrieve API SUCCESS voterGuidePossibilityRecognizedNamesRetrieveUrl: ' + voterGuidePossibilityRecognizedNamesRetrieveUrl);
      const t20 = performance.now();
      timingLogDebug && timingLog(t1, t20, 'voterGuidePossibilityHighlightsRetrieve API retrieve took', 8.0);

      const t21 = performance.now();
      // Send them to the page for speed
      processVoterGuideHighlightsRetrieve(voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse);
      const t22 = performance.now();
      timingLogDebug && timingLog(t21, t22, 'processVoterGuideHighlightsRetrieve end-to-end took', 8.0);
    }).fail((err) => {
      console.log('voterGuidePossibilityHighlightsRetrieve API error', err);
    });
  } else if (showCandidateOptionsHighlights) {
    // Get all candidates in this year's elections
    const t30 = performance.now();
    // $.ajaxSetup({ cache: true});  // Use the cache for this data
    $.getJSON(ballotItemHighlightsRetrieve, '', (ballotItemHighlightsRetrieveResponse) => {
      (debugBackground || getHighlightsListsFromApiServerDebug) && console.log('ENTERING showCANDIDATEOPTIONSHighlights backgroundWeVoteAPICalls > ballotItemHighlightsRetrieve API SUCCESS', ballotItemHighlightsRetrieveResponse);
      debugBackground &&  console.log('------------------- ballotItemHighlightsRetrieve API SUCCESS: ' + ballotItemHighlightsRetrieve);
      const t31 = performance.now();
      timingLogDebug && timingLog(t30, t31, 'ballotItemHighlightsRetrieve retrieve took', 8.0);

      const t32 = performance.now();
      // UPDATE THIS
      // processHighlightsRetrieve(ballotItemHighlightsRetrieveResponse, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse);
      const t33 = performance.now();
      timingLogDebug && timingLog(t32, t33, 'processHighlightsRetrieve end-to-end took', 8.0);
    }).fail((err) => {
      console.log('ballotItemHighlightsRetrieve API error', err);
    });
  }
}

function processHighlightsRetrieve (ballotItemHighlightsRetrieveResponse, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse) {
  const processHighlightsRetrieveDebug = true;
  const timingLogDebug = false;
  processHighlightsRetrieveDebug && console.log('ENTERING backgroundWeVoteAPICalls > processHighlightsRetrieve');
  let ballotItemHighlights = ballotItemHighlightsRetrieveResponse['highlight_list'];
  let neverHighLightOnLocal = ballotItemHighlightsRetrieveResponse['never_highlight_on'];
  let voterGuideHighlights = voterGuidePossibilityHighlightsRetrieveResponse['highlight_list'];

  // February 2020, these are temporary and can be removed once the python server is updated
  neverHighLightOnLocal.push('about:blank');
  neverHighLightOnLocal.push('platform.twitter.com');
  neverHighLightOnLocal.push('s7.addthis.com');
  neverHighLightOnLocal.push('vars.hotjar.com');
  neverHighLightOnLocal.push('*.google.com');
  neverHighLightOnLocal.push('regex101.com');
  debugBackground && console.log('get json ballotItemHighlights: ', ballotItemHighlights);
  (debugBackground || processHighlightsRetrieveDebug) && console.log('get json ballotItemHighlights.length: ', ballotItemHighlights.length);
  const t0 = performance.now();
  initializeHighlightsData(ballotItemHighlights, voterGuideHighlights, neverHighLightOnLocal);
  timingLogDebug && timingLog(t0, performance.now(), 'initializeHighlightsData took', 5.0);
  if (doReHighlight) {
    requestReHighlight();
  }
  sendResponse({
    success: ballotItemHighlightsRetrieveResponse.success,
    highlights: ballotItemHighlights.length,
    nameToIdMap,
  });
}

function processVoterGuideHighlightsRetrieve (voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse) {
  const processVoterGuideHighlightsRetrieveDebug = true;
  const timingLogDebug = false;
  (debugBackground || processVoterGuideHighlightsRetrieveDebug) && console.log('ENTERING backgroundWeVoteAPICalls > processVoterGuideHighlightsRetrieve');

  let neverHighLightOnLocal = voterGuidePossibilityHighlightsRetrieveResponse['never_highlight_on'];
  let voterGuideHighlights = voterGuidePossibilityHighlightsRetrieveResponse['highlight_list'];

  // February 2020, these are temporary and can be removed once the python server is updated
  neverHighLightOnLocal.push('about:blank');
  neverHighLightOnLocal.push('platform.twitter.com');
  neverHighLightOnLocal.push('s7.addthis.com');
  neverHighLightOnLocal.push('vars.hotjar.com');
  neverHighLightOnLocal.push('*.google.com');
  neverHighLightOnLocal.push('regex101.com');
  debugBackground && console.log('get json voterGuideHighlights: ', voterGuideHighlights);
  (debugBackground || processVoterGuideHighlightsRetrieveDebug) && console.log('get json voterGuideHighlights.length: ', voterGuideHighlights.length);
  const t0 = performance.now();
  initializeVoterGuideHighlightsData(voterGuideHighlights, neverHighLightOnLocal);
  timingLogDebug && timingLog(t0, performance.now(), 'initializeHighlightsData took', 5.0);
  if (doReHighlight) {
    requestReHighlight();
  }
  sendResponse({
    success: voterGuidePossibilityHighlightsRetrieveResponse.success,
    highlights: voterGuideHighlights.length,
    nameToIdMap,
  });
}

function getOrganizationFound (locationHref, sendResponse) {
  const getOrganizationFoundDebug = true;
  const timingLogDebug = false;
  let data = {};
  const hrefEncoded = encodeURIComponent(locationHref);
  const t0 = performance.now();
  const voterDeviceUrlVariable = localStorage['voterDeviceId'] ? `voter_device_id=${localStorage['voterDeviceId']}&` : "";
  const apiURL = `${rootApiURL}/voterGuidePossibilityRetrieve/?${voterDeviceUrlVariable}url_to_scan=${hrefEncoded}`;
  console.log('ENTERING backgroundWeVoteAPICalls > getOrganizationFound, voterGuidePossibilityRetrieve apiURL: ' + apiURL);
  $.getJSON(apiURL, '', (results) => {
    const t1 = performance.now();
    timingLogDebug && timingLog(t0, t1, 'voterGuidePossibilityRetrieve took', 8.0);
    (debugBackground || getOrganizationFoundDebug) && console.log('voterGuidePossibilityRetrieve API results received');
    let {voter_guide_possibility_edit: voterGuidePossibilityEdit, possibilityUrl, voter_guide_possibility_id: voterGuidePossibilityId, organization,
      possible_owner_of_website_organizations_list: noExactMatchOrgList} = results;
    if (voterGuidePossibilityEdit) {
      let {
        organization_email: email, organization_name: orgName, organization_twitter_handle: twitterHandle, organization_we_vote_id: weVoteId,
        organization_website: orgWebsite,
        we_vote_hosted_profile_image_url_medium: orgLogo,
      } = organization;

      voterGuidePossibilityIdCache[locationHref] = voterGuidePossibilityId;
      debugBackground && console.log('voter_guide_possibility_id:', voterGuidePossibilityId);

      for (let tabId in tabsHighlighted) {
        const { url } = tabsHighlighted[tabId];
        if (url === locationHref) {
          debugBackground && console.log('^^^^^^^^ getOrganizationFound before:', tabId, tabsHighlighted[tabId]);
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
          debugBackground && console.log('^^^^^^^^ getOrganizationFound after:', tabId, tabsHighlighted[tabId]);
          break;
        }
      }
    } else {
      console.log('ERROR: voterGuidePossibilityRetrieve returned with a undefined or null, results or results.organization');
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
  console.log('ENTERING backgroundWeVoteAPICalls > getVoterSignInInfo apiURL: ' + apiURL);

  if (voterDeviceId && voterDeviceId.length > 0) {
    $.getJSON(apiURL, '', (results) => {
      debugBackground && console.log('get json from getVoterSignInInfo voterRetrieve API SUCCESS', results);
      const {success, full_name: fullName, we_vote_id: weVoteId, voter_photo_url_medium: photoURL, is_signed_in: isSignedIn,
        signed_in_facebook: signedInFacebook, signed_in_google: signedInGoogle, signed_in_twitter: signedInTwitter, signed_in_with_email: signedInWithEmail } = results;
      data = {
        success,
        error:    success ? '' : results.status,
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
  const timingLogDebug = false;
  console.log('ENTERING backgroundWeVoteAPICalls > getPossiblePositions');
  // https://api.wevoteusa.org/apis/v1/voterGuidePossibilityPositionsRetrieve/?voter_device_id=cYBPkwago&voter_guide_possibility_id=65
  if (debugBackground && voterGuidePossibilityPositionsRetrieveT0 > 0) {
    timingLogDebug && timingLog(voterGuidePossibilityPositionsRetrieveT0, performance.now(), 'period between voterGuidePossibilityPositionsRetrieve calls ', 5.0);
  }
  const { voterDeviceId } = localStorage;
  if (voterDeviceId && voterDeviceId.length > 0) {
    let vGPId = voterGuidePossibilityId;
    if (!voterGuidePossibilityId || voterGuidePossibilityId === 0 || voterGuidePossibilityId === '' || voterGuidePossibilityId === 'undefined') {
      debugBackground && console.log('getPossiblePositions called without a voterGuidePossibilityIdCache');
      vGPId = voterGuidePossibilityIdCache[hrefURL];
      if (!vGPId || vGPId.length === 0) {
        debugBackground && console.log('No received or cached voterGuidePossibilityIdCache in getPossiblePositions for URL ', hrefURL);
      }
    }
    const apiURL = `${rootApiURL}/voterGuidePossibilityPositionsRetrieve/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${vGPId}`;
    debugBackground && console.log('getPossiblePositions: ' + apiURL);
    $.getJSON(apiURL, '', (results) => {
      debugBackground && console.log('get json from getPossiblePositions API returned ', results);

      const {possible_position_list: possiblePositions} = results;

      sendResponse({data: possiblePositions});
      voterGuidePossibilityPositionsRetrieveT0 = performance.now();
    }).fail((err) => {
      console.log('getPossiblePositions error', err);
    });
  }
}

function updatePossibleVoterGuide (voterGuidePossibilityId, orgName, orgTwitter, orgState, comments, sendResponse) {
  const updatePossibleVoterGuideDebug = false;
  console.log('ENTERING backgroundWeVoteAPICalls > updatePossibleVoterGuide');
  const { voterDeviceId } = localStorage;
  (debugBackground || updatePossibleVoterGuideDebug) && console.log('updatePossibleVoterGuide voterGuidePossibilitySave voterGuidePossibilityId: ' + voterGuidePossibilityId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    const apiURL = `${rootApiURL}/voterGuidePossibilitySave/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${voterGuidePossibilityId}` +
      `&possible_organization_name=${encodeURIComponent(orgName ? orgName.trim() : '')}` +
      `&possible_organization_twitter_handle=${encodeURIComponent(orgTwitter ? orgTwitter.trim() : '')}` +
      `&contributor_comments=${encodeURIComponent(comments)}&limit_to_this_state_code=${orgState ? orgState.trim(): ''}`;
    (debugBackground || updatePossibleVoterGuideDebug) && console.log('voterGuidePossibilitySave: ' + apiURL);
    $.getJSON(apiURL, '', (results) => {
      (debugBackground || updatePossibleVoterGuideDebug) && console.log('updatePossibleVoterGuide voterGuidePossibilitySave API results:', results);
      const { possible_organization_name: orgName, contributor_comments: comments } = results;
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
  console.log('ENTERING backgroundWeVoteAPICalls > voterGuidePossibilityPositionSave voterGuidePossibilityPositionId: ' + voterGuidePossibilityPositionId);
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
    debugBackground && console.log('voterGuidePossibilityPositionSave: ' + apiURL);
    $.getJSON(apiURL, '', (results) => {
      debugBackground && console.log('get json from voterGuidePossibilityPositionSave API SUCCESS', results);
      sendResponse({results});
    }).fail((err) => {
      console.log('voterGuidePossibilityPositionSave error', err);
    });
  }
}

// Save a possible voter guide
function voterGuidePossibilitySave (organizationWeVoteId, voterGuidePossibilityId, internalNotes, contributorEmail, sendResponse) {
  const voterGuidePossibilitySaveDebug = true;
  // eslint-disable-next-line prefer-destructuring
  let voterDeviceId = localStorage['voterDeviceId'];
  (debugBackground || voterGuidePossibilitySaveDebug) && console.log('ENTERING backgroundWeVoteAPICalls > voterGuidePossibilitySave (really the organization_we_vote_id) voterGuidePossibilityId: ' + voterGuidePossibilityId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    let apiURL = `${rootApiURL}/voterGuidePossibilitySave/?voter_device_id=${voterDeviceId}` +
      `&voter_guide_possibility_id=${voterGuidePossibilityId}&organization_we_vote_id=${organizationWeVoteId}&internal_notes=${encodeURIComponent(internalNotes)}&contributor_email=${contributorEmail}`;
    (debugBackground || voterGuidePossibilitySaveDebug) && console.log('voterGuidePossibilitySave: ' + apiURL);
    $.getJSON(apiURL, '', (results) => {
      (debugBackground || voterGuidePossibilitySaveDebug) && console.log('voterGuidePossibilitySave API results:', results);
      sendResponse({results});
    }).fail((err) => {
      console.log('voterGuidePossibilitySave error', err);
    });
  } else {
    let results = {
      success: false,
      message: 'Cannot make ths api call unless you are logged in, and have a voterDeviceId',
    };
    sendResponse({results});
  }
}

function getCandidate (candidateWeVoteId, sendResponse) {
  // eslint-disable-next-line prefer-destructuring
  let voterDeviceId = localStorage['voterDeviceId'];
  /*debugBackground &&*/ console.log('ENTERING backgroundWeVoteAPICalls > getCandidate for candidateWeVoteId: ' + candidateWeVoteId);
  if (voterDeviceId && voterDeviceId.length > 0) {
    let apiURL = `${rootApiURL}/candidateRetrieve/?voter_device_id=${voterDeviceId}` +
      `&candidate_id=&candidate_we_vote_id=${candidateWeVoteId}`;
    // debugBackground &&
    console.log('getCandidate: ' + apiURL);
    $.getJSON(apiURL, '', (results) => {
      debugBackground && console.log('get json from getCandidate API SUCCESS', results);
      sendResponse({results});
    }).fail((err) => {
      console.log('getCandidate error', err);
    });
  } else {
    let results = {
      success: false,
      message: 'Can not make ths api call unless you are logged in, and have a voterDeviceId',
    };
    sendResponse({results});
  }
}

function convertPdfToHtmlInS3 (pdfURL, sendResponse) {
  debugBackground && console.log('ENTERING backgroundWeVoteAPICalls > convertPdfToHtmlInS3: ' + pdfURL);
  // eslint-disable-next-line prefer-destructuring
  let voterDeviceId = localStorage['voterDeviceId'];

  if (voterDeviceId && voterDeviceId.length > 0) {
    let apiURL = `${rootApiURL}/pdfToHtmlRetrieve/?voter_device_id=${voterDeviceId}&pdf_url=${pdfURL}`;
    // let apiURL = `${rootApiURL}/pdfToHtmlRetrieve?voter_device_id=${voterDeviceId}&pdf_url=${pdfURL}`;
    // debugBackground && console.log('convertPdfToHtmlInS3: ' + apiURL);
    $.getJSON(apiURL, '', (results) => {
      debugBackground && console.log('get json from convertPdfToHtmlInS3 API SUCCESS', results);
      sendResponse({results});
    }).fail((err) => {
      console.log('convertPdfToHtmlInS3 error', err);
    });
  } else {
    let results = {
      success: false,
      message: 'Can not make ths api call unless you are logged in, and have a voterDeviceId',
    };
    sendResponse({results});
  }
}
