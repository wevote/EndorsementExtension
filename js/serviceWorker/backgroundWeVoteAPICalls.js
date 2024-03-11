/* global overrideStartingYear, startingYearOverride */
const voterGuidePossibilityIdCache = {};  // we lose the current value when we reload in a iFrame, so cache it here
let voterGuidePossibilityPositionsRetrieveT0 = 0;

// All the functions would be flagged without the following
/* eslint-disable no-unused-vars */
/* eslint no-undef: 0 */

async function getHighlightsListsFromApiServer (locationHref, voterDeviceId, tabId, doReHighlight, sendResponse, showVoterGuideHighlights, showCandidateOptionsHighlights, pageContent) {
  const getHighlightsListsFromApiServerDebug = true;
  debugSwLog('ENTERING backgroundWeVoteAPICalls > getHighlightsListsFromApiServer, showVoterGuideHighlights:', showVoterGuideHighlights, ', showCandidateOptionsHighlights:', showCandidateOptionsHighlights);
  if (!showVoterGuideHighlights && !showCandidateOptionsHighlights) {
    debugSwLog('EXITING getHighlightsListsFromApiServer without highlighting');
  }
  const state = await getGlobalState();
  const { pdfURL } = state;
  let urlToEncode = locationHref;
  if (urlToEncode.includes('wevote-temporary.s3.amazonaws.com')) {
    if (pdfURL && pdfURL.length) {
      urlToEncode = pdfURL;
    }
  }

  const hrefEncoded = encodeURIComponent(urlToEncode); //'https://www.emilyslist.org/pages/entry/state-and-local-candidates');
  // let ballotItemHighlightsRetrieve = `${rootCdnURL}/ballotItemHighlightsRetrieve/`; // Use CDN
  // if (overrideStartingYear) {  // This is for testing old endorsement pages that need candidate data that is a few years old
  //   ballotItemHighlightsRetrieve += '?starting_year=' + startingYearOverride;
  // }
  const voterGuidePossibilityHighlightsRetrieve = `${rootApiURL}/voterGuidePossibilityHighlightsRetrieve/?voter_device_id=${voterDeviceId}&limit_to_existing=true&url_to_scan=${hrefEncoded}`;
  const voterGuidePossibilityHighlightsRetrieve2 =`${rootApiURL}/voterGuidePossibilityHighlightsRetrieve/` 
  debugSwLog('voterGuidePossibilityHighlightsRetrieve: ', voterGuidePossibilityHighlightsRetrieve);
  // debugSwLog('ballotItemHighlightsRetrieve: ' + ballotItemHighlightsRetrieve);

  const t1 = performance.now();
  if (showVoterGuideHighlights && showCandidateOptionsHighlights){
    debugSwLog('background voterGuidePossibilityHighlightsRetrieve (get the greens/reds/grays)', voterGuidePossibilityHighlightsRetrieve);
    const formData = new URLSearchParams();
    formData.append('voter_device_id', voterDeviceId);
    formData.append('url_to_scan', urlToEncode);
    formData.append('visible_text_to_scan', pageContent);

    fetch(voterGuidePossibilityHighlightsRetrieve2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }).then((resp) => resp.json()).then((voterGuidePossibilityHighlightsRetrieveResponse) => {
        console.log('voterGuidePossibilityHighlightsRetrieve2',voterGuidePossibilityHighlightsRetrieveResponse)
        getHighlightsListsFromApiServerDebug && debugSwLog('ENTERING COMBINED backgroundWeVoteAPICalls > voterGuidePossibilityHighlightsRetrieve API results received');
        debugSwLog('------------------- voterGuidePossibilityHighlightsRetrieve API SUCCESS voterGuidePossibilityHighlightsRetrieve: ' + voterGuidePossibilityHighlightsRetrieve);
        const t2 = performance.now();
        timingSwLog(t1, t2, 'voterGuidePossibilityHighlightsRetrieve API retrieve took', 8.0);
        // Get all candidates in this year's elections
        const t3 = performance.now();
        processHighlightsRetrieve(tabId, locationHref, voterGuidePossibilityHighlightsRetrieveResponse,
          doReHighlight, sendResponse);
        const t6 = performance.now();
        timingSwLog(t5, t6, 'processHighlightsRetrieve end-to-end took', 8.0);
    }).catch((err) => {
      debugSwLog('voterGuidePossibilityHighlightsRetrieve API error', err);
    });
  } else if (showVoterGuideHighlights) {
    // Get the entries already found from page scan
    debugSwLog('ZZZZZZZZZZ background showVoterGuideHighlights', voterGuidePossibilityHighlightsRetrieve);
    fetch(voterGuidePossibilityHighlightsRetrieve, {method: 'GET'}).then((resp) => resp.json()).then((voterGuidePossibilityHighlightsRetrieveResponse) => {
      const { url_to_scan: voterGuidePossibilityRecognizedNamesRetrieveUrl } = voterGuidePossibilityHighlightsRetrieveResponse;
      getHighlightsListsFromApiServerDebug && debugSwLog('ENTERING showVOTERGUIDEHighlights backgroundWeVoteAPICalls > voterGuidePossibilityHighlightsRetrieve API results received.');
      debugSwLog('------------------- voterGuidePossibilityHighlightsRetrieve API SUCCESS voterGuidePossibilityRecognizedNamesRetrieveUrl: ' + voterGuidePossibilityRecognizedNamesRetrieveUrl);
      const t20 = performance.now();
      timingSwLog(t1, t20, 'voterGuidePossibilityHighlightsRetrieve API retrieve took', 8.0);

      const t21 = performance.now();
      // Send them to the page for speed
      processVoterGuideHighlightsRetrieve(tabId, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse, voterGuidePossibilityRecognizedNamesRetrieveUrl);
      const t22 = performance.now();
      timingSwLog(t21, t22, 'processVoterGuideHighlightsRetrieve end-to-end took', 8.0);


    }).catch((err) => {
      debugSwLog('voterGuidePossibilityHighlightsRetrieve API error', err);
    });

  } else if (showCandidateOptionsHighlights) {
    // Get all candidates in this year's elections
    const t30 = performance.now();
    // $.ajaxSetup({ cache: true});  // Use the cache for this data
    console.log('background apiURL', ballotItemHighlightsRetrieve);
    fetch(ballotItemHighlightsRetrieve).then((resp) => resp.json()).then((ballotItemHighlightsRetrieveResponse) => {
      getHighlightsListsFromApiServerDebug && debugSwLog('ENTERING showCANDIDATEOPTIONSHighlights backgroundWeVoteAPICalls > ballotItemHighlightsRetrieve API SUCCESS', ballotItemHighlightsRetrieveResponse);
      debugSwLog('------------------- ballotItemHighlightsRetrieve API SUCCESS: ' + ballotItemHighlightsRetrieve);
      const t31 = performance.now();
      timingSwLog(t30, t31, 'ballotItemHighlightsRetrieve retrieve took', 8.0);

      const t32 = performance.now();
      // TODO UPDATE THIS: Yow! What is locationURL and voterGuidePossibilityHighlightsRetrieveResponse?
      processHighlightsRetrieve(tabId, locationURL, ballotItemHighlightsRetrieveResponse, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse);
      const t33 = performance.now();
      timingSwLog(t32, t33, 'processHighlightsRetrieve end-to-end took', 8.0);
    }).catch((err) => {
      debugSwLog('ballotItemHighlightsRetrieve API error', err);
    });
  }
}

function processHighlightsRetrieve (tabId, url, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse) {
  const processHighlightsRetrieveDebug = false;
  debugSwLog('ENTERING backgroundWeVoteAPICalls > processHighlightsRetrieve');
  let neverHighLightOnLocal = voterGuidePossibilityHighlightsRetrieveResponse['never_highlight_on'];
  let voterGuideHighlights = voterGuidePossibilityHighlightsRetrieveResponse['highlight_list'];

  const t0 = performance.now();
  initializeHighlightsData(voterGuideHighlights, neverHighLightOnLocal);
  timingSwLog(t0, performance.now(), 'initializeHighlightsData took', 5.0);
  if (doReHighlight) {
    requestReHighlight(tabId, url);
  }
  sendResponse({
    success: voterGuidePossibilityHighlightsRetrieveResponse.success,
    highlights: voterGuidePossibilityHighlightsRetrieveResponse.length,
    nameToIdMap,
  });
}

function processVoterGuideHighlightsRetrieve (tabId, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse, reHighlightUrl) {
  const processVoterGuideHighlightsRetrieveDebug = true;
  processVoterGuideHighlightsRetrieveDebug && debugSwLog('ENTERING backgroundWeVoteAPICalls > processVoterGuideHighlightsRetrieve');

  let neverHighLightOnLocal = voterGuidePossibilityHighlightsRetrieveResponse['never_highlight_on'];
  let voterGuideHighlights = voterGuidePossibilityHighlightsRetrieveResponse['highlight_list'];

  // February 2020, these are temporary and can be removed once the python server is updated
  neverHighLightOnLocal.push('about:blank');
  neverHighLightOnLocal.push('platform.twitter.com');
  neverHighLightOnLocal.push('s7.addthis.com');
  neverHighLightOnLocal.push('vars.hotjar.com');
  neverHighLightOnLocal.push('*.google.com');
  neverHighLightOnLocal.push('regex101.com');
  debugSwLog('get json voterGuideHighlights: ', voterGuideHighlights);
  processVoterGuideHighlightsRetrieveDebug && debugSwLog('get json voterGuideHighlights.length: ', voterGuideHighlights.length);
  const t0 = performance.now();
  initializeVoterGuideHighlightsData(tabId, voterGuideHighlights, neverHighLightOnLocal);
  timingSwLog(t0, performance.now(), 'initializeHighlightsData took', 5.0);
  if (doReHighlight) {
    requestReHighlight(tabId, reHighlightUrl);
  }
  sendResponse({
    success: voterGuidePossibilityHighlightsRetrieveResponse.success,
    highlights: voterGuideHighlights.length,
    nameToIdMap,
  });
}

function getOrganizationFound (locationHref, sendResponse) {
  const getOrganizationFoundDebug = true;
  let data = {};
  const hrefEncoded = encodeURIComponent(locationHref);
  const t0 = performance.now();
  getVoterDeviceId().then((voterDeviceId) => {
    debugSwLog('getOrganizationFound voterDeviceId Value currently is ', voterDeviceId);

    const voterDeviceUrlVariable = voterDeviceId ? `voter_device_id=${voterDeviceId}&` : '';
    const apiURL = `${rootApiURL}/voterGuidePossibilityRetrieve/?${voterDeviceUrlVariable}url_to_scan=${hrefEncoded}${allowAnyYearForVoterGuides ? '&limit_to_this_year=false' : ''}`;
    debugSwLog('ENTERING backgroundWeVoteAPICalls > getOrganizationFound, voterGuidePossibilityRetrieve apiURL: ' + apiURL);
    fetch(apiURL).then((resp) => resp.json()).then((results) => {
      const t1 = performance.now();
      // This takes 4 to 8.5 seconds to execute
      timingSwLog(t0, t1, 'voterGuidePossibilityRetrieve took', 8.0);
      getOrganizationFoundDebug && debugSwLog('voterGuidePossibilityRetrieve API results received', results);
      let {
        voter_guide_possibility_edit: voterGuidePossibilityEdit,
        possibilityUrl,
        voter_guide_possibility_id: voterGuidePossibilityId,
        organization,
        possible_owner_of_website_organizations_list: noExactMatchOrgList
      } = results;
      if (voterGuidePossibilityEdit) {
        let {
          organization_email: email,
          organization_name: orgName,
          organization_twitter_handle: twitterHandle,
          organization_we_vote_id: weVoteId,
          organization_website: orgWebsite,
          we_vote_hosted_profile_image_url_medium: orgLogo,
        } = organization;

        voterGuidePossibilityIdCache[locationHref] = voterGuidePossibilityId;
        debugSwLog('voter_guide_possibility_id:', voterGuidePossibilityId);

        updateGlobalState({
          'organizationName': orgName,
          'organizationWeVoteId': weVoteId,
          'organizationTwitterHandle': twitterHandle,
          'voterGuidePossibilityId': voterGuidePossibilityId,
        }).then(() => {
          console.log('Updated state with organization info for ', orgName);
        });

        for (let tabId in tabsHighlighted) {
          const {url} = tabsHighlighted[tabId];
          if (url === locationHref) {
            debugSwLog('^^^^^^^^ getOrganizationFound before:', tabId, tabsHighlighted[tabId]);
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
            debugSwLog('^^^^^^^^ getOrganizationFound after:', tabId, tabsHighlighted[tabId]);
            break;
          }
        }
      } else {
        debugSwLog('ERROR: voterGuidePossibilityRetrieve returned with a undefined or null, results or results.organization');
        data = {};
      }
      sendResponse({data: data});
    }).catch(function (d, textStatus, error) {
      console.error(`fetch() voterGuidePossibilityRetrieve failed, status: ${textStatus}, error: ${error}`);
    });
    return data;
  });
}

function getVoterSignInInfo (sendResponse) {
  let data = {};
  getVoterDeviceId().then((voterDeviceId) => {
    console.log('getVoterSignInInfo voterDeviceId Value currently is ', voterDeviceId);
    const apiURL = `${rootApiURL}/voterRetrieve/?voter_device_id=${voterDeviceId}`;
    debugSwLog('ENTERING backgroundWeVoteAPICalls > getVoterSignInInfo apiURL: ' + apiURL);

    if (voterDeviceId && voterDeviceId.length > 0) {
      console.log('background apiURL', apiURL);
      fetch(apiURL).then((resp) => resp.json()).then((results) => {
        debugSwLog('get json from getVoterSignInInfo voterRetrieve API SUCCESS', results);
        const {success, full_name: fullName, we_vote_id: weVoteId, voter_photo_url_medium: photoURL, is_signed_in: voterIsSignedIn,
          signed_in_facebook: signedInFacebook, signed_in_google: signedInGoogle, signed_in_twitter: signedInTwitter, signed_in_with_email: signedInWithEmail } = results;
        data = {
          success,
          error:    success ? '' : results.status,
          fullName,
          photoURL,
          weVoteId,
          voterIsSignedIn,
          signedInFacebook,
          signedInGoogle,
          signedInTwitter,
          signedInWithEmail
        };
        // debugSwLog("get json from updateSignedInVoter photoURL" + photoURL);
        sendResponse({data: data});
      }).catch((err) => {
        data = {
          success: false,
          error: 'EXCEPTION',
          err: err,
        };
        debugSwLog('getVoterSignInInfo error', err);
        sendResponse({data: data});
      });
    } else {
      debugSwLog('NOT SIGNED IN ERROR in getVoterSignInInfo no voterDeviceId in local storage');
      data = {
        success: false,
        error: 'NOVOTERID',
      };
      sendResponse({data: data});
    }
  });
}

function getPossiblePositions (voterGuidePossibilityId, hrefURL, voterDeviceId, isIFrame, sendResponse) {
  debugSwLog('ENTERING backgroundWeVoteAPICalls > getPossiblePositions');
  // https://api.wevoteusa.org/apis/v1/voterGuidePossibilityPositionsRetrieve/?voter_device_id=cYBPkwago&voter_guide_possibility_id=65
  if (voterGuidePossibilityPositionsRetrieveT0 > 0) {
    timingSwLog(voterGuidePossibilityPositionsRetrieveT0, performance.now(), 'period between voterGuidePossibilityPositionsRetrieve calls ', 5.0);
  }

  if (voterDeviceId && voterDeviceId.length > 0) {
    let vGPId = voterGuidePossibilityId;
    if (!voterGuidePossibilityId || voterGuidePossibilityId === 0 || voterGuidePossibilityId === '' || voterGuidePossibilityId === 'undefined') {
      debugSwLog('getPossiblePositions called without a voterGuidePossibilityIdCache');
      vGPId = voterGuidePossibilityIdCache[hrefURL];
      if (!vGPId || vGPId.length === 0) {
        debugSwLog('No received or cached voterGuidePossibilityIdCache in getPossiblePositions for URL ', hrefURL);
      }
    }
    const apiURL = `${rootApiURL}/voterGuidePossibilityPositionsRetrieve/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${vGPId}${allowAnyYearForVoterGuides ? '&limit_to_this_year=false' : ''}`;
    debugSwLog('getPossiblePositions fetch: ' + apiURL);
    console.log('background apiURL', apiURL);
    // console.log('voterGuidePossibilityPositionsRetrieve response date', Date.now());
    fetch(apiURL).then((resp) => resp.json()).then((results) => {
      debugSwLog('get json from getPossiblePositions API returned ', results);
      const {possible_position_list: possiblePositions} = results;
      // June 20, 2023: If we are getting updated data to fill in the right pane in paneled view, update the HighlightsData to keep it from getting stale
      initializeVoterGuideHighlightsData (null, possiblePositions, null);

      sendResponse({data: possiblePositions});
      voterGuidePossibilityPositionsRetrieveT0 = performance.now();
    }).catch((err) => {
      debugSwLog('getPossiblePositions error', err);
    });
  }
  debugSwLog('EXITING backgroundWeVoteAPICalls > getPossiblePositions');
}

function updatePossibleVoterGuide (voterGuidePossibilityId, orgName, orgTwitter, orgState, comments, sendResponse) {
  const updatePossibleVoterGuideDebug = true;
  debugSwLog('ENTERING backgroundWeVoteAPICalls > updatePossibleVoterGuide');
  getVoterDeviceId().then((voterDeviceId) => {
    console.log('updatePossibleVoterGuide voterDeviceId Value currently is ', voterDeviceId);

    updatePossibleVoterGuideDebug && debugSwLog('updatePossibleVoterGuide voterGuidePossibilitySave voterGuidePossibilityId: ' + voterGuidePossibilityId);
    if (voterDeviceId && voterDeviceId.length > 0) {
      const apiURL = `${rootApiURL}/voterGuidePossibilitySave/?voter_device_id=${voterDeviceId}&voter_guide_possibility_id=${voterGuidePossibilityId}` +
        `&possible_organization_name=${encodeURIComponent(orgName ? orgName.trim() : '')}` +
        `&possible_organization_twitter_handle=${encodeURIComponent(orgTwitter ? orgTwitter.trim() : '')}` +
        `&contributor_comments=${encodeURIComponent(comments)}&limit_to_this_state_code=${orgState ? orgState.trim() : ''}`;
      updatePossibleVoterGuideDebug && debugSwLog('voterGuidePossibilitySave fetch: ' + apiURL);
      console.log('background apiURL', apiURL);
      fetch(apiURL).then((resp) => resp.json()).then((results) => {
        updatePossibleVoterGuideDebug && debugSwLog('updatePossibleVoterGuide voterGuidePossibilitySave API results:', results);
        // console.log('updatePossibleVoterGuide voterGuidePossibilitySave API results:', Date.now(), results);
        const {
          possible_organization_name: orgName,
          contributor_comments: comments
        } = results;
        let data = {
          orgName: orgName,
          comments: comments,
        };
        sendResponse({data: data});
      }).catch((err) => {
        debugSwLog('updatePossibleVoterGuide error', err);
      });
    }
  });
}

function voterGuidePossibilityPositionSave (itemName, voterGuidePossibilityId, voterGuidePossibilityPositionId, stance, statementText, moreInfoURL, removePosition, sendResponse) {
  //  Dale: 9/16/19
  //  Remove the voter_device_id and voter_guide_possibility_id
  //  Enter the "possibility_position_id" into the "voter_guide_possibility_position_id" field in the try it now form
  //  Do not send empty values on the url, since that might clear out good data on the Python side
  //  Steve: voter_guide_possibility_position_id completely specifies the possibility and nothing else is needed for the search/match
  getVoterDeviceId().then((voterDeviceId) => {
    debugSwLog('ENTERING backgroundWeVoteAPICalls > voterGuidePossibilityPositionSave voterGuidePossibilityPositionId: ' + voterGuidePossibilityPositionId);
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
      debugSwLog('voterGuidePossibilityPositionSave: ', Date.now(), apiURL);
      console.log('background apiURL', apiURL);
      fetch(apiURL).then((resp) => resp.json()).then((results) => {
        debugSwLog('get json from voterGuidePossibilityPositionSave API SUCCESS', results);
        sendResponse({results});
      }).catch((err) => {
        debugSwLog('voterGuidePossibilityPositionSave error', err);
      });
    }
  });
}

// Save a possible voter guide
function voterGuidePossibilitySave (organizationWeVoteId, voterGuidePossibilityId, internalNotes, contributorEmail, sendResponse) {
  const voterGuidePossibilitySaveDebug = true;
  // eslint-disable-next-line prefer-destructuring
  getVoterDeviceId().then((voterDeviceId) => {
    console.log('voterGuidePossibilitySave voterDeviceId Value currently is ', voterDeviceId);

    voterGuidePossibilitySaveDebug && debugSwLog('ENTERING backgroundWeVoteAPICalls > voterGuidePossibilitySave (really the organization_we_vote_id) voterGuidePossibilityId: ' + voterGuidePossibilityId);
    if (voterDeviceId && voterDeviceId.length > 0) {
      let apiURL = `${rootApiURL}/voterGuidePossibilitySave/?voter_device_id=${voterDeviceId}` +
        `&voter_guide_possibility_id=${voterGuidePossibilityId}&organization_we_vote_id=${organizationWeVoteId}&internal_notes=${encodeURIComponent(internalNotes)}&contributor_email=${contributorEmail}`;
      voterGuidePossibilitySaveDebug && debugSwLog('voterGuidePossibilitySave: ' + apiURL);
      console.log('background apiURL', apiURL);
      fetch(apiURL).then((resp) => resp.json()).then((results) => {
        voterGuidePossibilitySaveDebug && debugSwLog('voterGuidePossibilitySave API results:', results);
        sendResponse({results});
      }).catch((err) => {
        debugSwLog('voterGuidePossibilitySave error', err);
      });
    } else {
      let results = {
        success: false,
        message: 'Cannot make ths api call unless you are logged in, and have a voterDeviceId',
      };
      sendResponse({results});
    }
  });
}

function getCandidate (candidateWeVoteId, sendResponse) {
  // eslint-disable-next-line prefer-destructuring
  getVoterDeviceId().then((voterDeviceId) => {
    console.log('getCandidate voterDeviceId Value currently is ', voterDeviceId);

    debugSwLog('ENTERING backgroundWeVoteAPICalls > getCandidate for candidateWeVoteId: ' + candidateWeVoteId);
    if (voterDeviceId && voterDeviceId.length > 0) {
      let apiURL = `${rootApiURL}/candidateRetrieve/?voter_device_id=${voterDeviceId}` +
        `&candidate_id=&candidate_we_vote_id=${candidateWeVoteId}`;
      // debugBackground &&
      debugSwLog('getCandidate: ' + apiURL);
      console.log('background apiURL', apiURL);
      fetch(apiURL).then((resp) => resp.json()).then((results) => {
        if (results.length) {
          debugSwLog('get json from getCandidate API SUCCESS', results);
          sendResponse({results});
        } else {
          debugSwLog('getCandidate error, returned empty array');
        }
      }).catch((err) => {
        debugSwLog('getCandidate error', err);
      });
    } else {
      let results = {
        success: false,
        message: 'Can not make ths api call unless you are logged in, and have a voterDeviceId',
        s3_url_for_html: '',    // eslint-disable-line camelcase
      };
      sendResponse({results});
    }
  });
}

function convertPdfToHtmlInS3 (pdfURL, sendResponse) {
  debugSwLog('ENTERING backgroundWeVoteAPICalls > convertPdfToHtmlInS3: ' + pdfURL);
  // eslint-disable-next-line prefer-destructuring
  getVoterDeviceId().then(async (voterDeviceId) => {
    console.log('getCandidate voterDeviceId Value currently is ', voterDeviceId);
    if (voterDeviceId && voterDeviceId.length > 0) {
      let apiURL = `${rootApiURL}/pdfToHtmlRetrieve/?voter_device_id=${voterDeviceId}&pdf_url=${pdfURL}`;
      await updateGlobalState({pdfURL: pdfURL});
      console.log('background apiURL', apiURL);
      fetch(apiURL).then((resp) => resp.json()).then((results) => {
        debugSwLog('get json from convertPdfToHtmlInS3 API SUCCESS', results);
        sendResponse({results});
      }).catch((err) => {
        debugSwLog('convertPdfToHtmlInS3 error', err);
      });
    } else {
      let results = {
        success: false,
        message: 'Can not make ths api call unless you are logged in, and have a voterDeviceId',
      };
      sendResponse({results});
    }
  });
}

