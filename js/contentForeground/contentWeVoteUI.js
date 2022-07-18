/* global $, markupForThumbSvg, extensionSignInPage, extensionSignInPage, addCandidateExtensionWebAppURL, colors,
   isInOurIFrame */

const defaultImage = 'https://wevote.us/img/endorsement-extension/endorsement-icon48.png';

let weContentState = {
  allNames: '',
  candidateName: '',
  highlighterEditorEnabled: false,
  highlighterEnabled: false,
  highlighterEnabledThisTab: false,
  priorHighlighterEnabledThisTab: false,
  isFromPDF:  false,
  neverHighlightOn: {},
  orgName: '',
  organizationTwitterHandle: '',
  organizationWeVoteId: '',
  positions: [],
  positionsCount: 0,
  possibleOrgsList: [],
  priorData: [],
  tabId: -1,
  voterGuidePossibilityId: '',
  voterIsSignedIn: false,
  voterWeVoteId: '',
};

function isInOurIFrame () {
  const headerExists = $('div#wedivheader').length > 0;   // this is true if in our highlighted "Endorsement Page" that is framed by the "Open Edit Panel" button action}
  const correctFrameExists = $('iframe.weVoteEndorsementFrame').length > 0;
  const { host } = window.location;
  const isAPotentialEndorsementPage = !(host.includes('localhost') || host.includes('wevote.us') || host.includes('about:blank'));
  return correctFrameExists && isAPotentialEndorsementPage;
}

/**
 * Display (or remove) the highlighting on the endorsement page, and optionally the editor
 * @param {boolean} highlighterEnabledThisTab - true to display the highlighting, false to remove it and the editor
 * @param {boolean} highlighterEditorEnabled - true to display the editor
 * @param {number} tabId - chromes tab number for currently displayed tab
 * @returns {boolean} - return true to indicate that we want to call the response function asynchronously
 */
function displayHighlightingAndPossiblyEditor (highlighterEnabledThisTab, highlighterEditorEnabled, tabId) {  // eslint-disable-line no-unused-vars
  const displayHighlightingAndPossiblyEditorDebug = true;
  displayHighlightingAndPossiblyEditorDebug && debugFgLog('ENTERING contentWeVoteUI > displayHighlightingAndPossiblyEditor highlighterEnabledThisTab: ', highlighterEnabledThisTab, ', highlighterEditorEnabled: ', highlighterEditorEnabled, ', tabId: ', tabId);
  if (tabId && !isNaN(tabId)) {
    weContentState.tabId = tabId;
  }

  const urlToQuery = $('input[name="pdfFileName"]').val();
  weContentState.isFromPDF = urlToQuery && urlToQuery.length > 0;   // This is for PDFs that have been converted to HTML by PDFMinerSix
  if (weContentState.isFromPDF) {
    fixupForPdfMinerSix();
  }

  try {
    if (highlighterEnabledThisTab) {
      debugFgLog('displayHighlightingAndPossiblyEditor ----- for tab: ' + tabId);
      getHighlights(highlighterEnabledThisTab, highlighterEditorEnabled, tabId);   // Calls BuildUI when the API query completes
    } else if (isInOurIFrame()) { // Disable UI (reload the page)
      debugFgLog('Unloading displayHighlightingAndPossiblyEditor as requested from popup (before reload) in iFrame----- for tab: ' + tabId);
      location.reload();
    } else {
      debugFgLog('Unloading displayHighlightingAndPossiblyEditor as requested from popup (before reload) NOT in our iFrame----- for tab: ' + tabId);
      location.href += '';
    }
  } catch (err) {
    debugFgLog('jQuery dialog in contentWeVoteUI threw: ', err);
  }
  return true;  // indicates that we call the response function asynchronously.  https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
}

function fixupForPdfMinerSix () {
  $('div').each((i, div) => {
    $(div).each((j, span) => {
      const markup = span.outerHTML;
      // debugFgLog('Initial span markup: ', markup);
      try {
        let startSpan = markup.match(/(<span .*?>)/);
        if (startSpan) {
          // debugFgLog('startSpan: ', startSpan[0]);
          const count = (markup.match(/(<br>)/gm) || []).length;
          if (count > 1) {
            // eslint-disable-next-line prefer-destructuring
            let divSpanLeader = markup.match(/(<div.*?span.*?>)/)[0];
            let thisTop = divSpanLeader.match(/top:(\d*)px;/);
            let top = parseInt(thisTop[1], 10);
            // debugFgLog('divSpanLeader: ', divSpanLeader);
            let previous = span;
            let lines = markup.match(/(?:[\f\n]<br>|<span.*?>)(.*?)*\n/gm);
            for (let line in lines) {
              // debugFgLog('line: ', lines[line]);
              let clean = lines[line] ? lines[line].replace(/(<.*?>)/g, '') : '';
              // debugFgLog('clean: ', clean);
              top += 12;
              let thisLeader = divSpanLeader.replace(/(top:\d*px;)/g, 'top:' + top + 'px;');
              let newLine = thisLeader + clean + '</span><br></div>\n';
              // debugFgLog('newLine: ', newLine);
              previous = $(newLine).insertAfter(previous);
            }
            if (span !== previous) {
              span.remove();
            }
          }
        }
      } catch (e) {
        console.error('fixupForPdfMinerSix threw exception: ', e, ' while parsing ', markup);

      }
    });
  });
}

function displayEditPanes () {
  debugFgLog('Building WeVote UI --------------------------------');
  let hr = window.location.href;
  let bod = $('body');
  $(bod).children().wrapAll("<div id='noDisplayPageBeforeFraming' >").hide();  // if you remove it, other js goes nuts
  $(bod).children().wrapAll("<div id='weContainer' >");  // Ends up before noDisplayPageBeforeFraming
  $('#noDisplayPageBeforeFraming').insertAfter('#weContainer');

  let weContainer = $('#weContainer');
  $(weContainer).append('' +
    "<span id='topMenu'>" +
    '</span>').append("<div id='weFlexBox' ></div>");

  let weFlexBox = $('#weFlexBox');
  $(weFlexBox).append('<div id="frameDiv"><iframe id="frame" width="100%" name="tabId" ></iframe></div>');
  $(weFlexBox).append('<div id="sideArea"></div>');
  $('#frame').attr('src', hr).attr('class','weVoteEndorsementFrame');
  topMenu();
  updateTopMenu(true);
  signIn(false);                       // Calls handleUpdatedOrNewPositions() to draw the initial position pane if the editor has been chosen on popup.js
  initializeOrgChoiceList();           //  Does not display an org choice list, if not logged in, or have not chosen an org
  greyAllPositionPanes(false);
}

// function updateIframeByNameWithTabId() {
//
// }

function initializeOrgChoiceList () {
  setTimeout(() => {
    if (weContentState.voterWeVoteId && weContentState.voterWeVoteId.length) {
      if (weContentState.possibleOrgsList && weContentState.possibleOrgsList.length) {
        orgChoiceDialog(weContentState.possibleOrgsList);
      } else if (weContentState.positionsCount === 0) {
        setSideAreaStatus('No Candidate endorsements have been captured yet for this endorsement page.');
        setTimeout(() => {
          debugFgLog('Second attempt to get a weContentState.position value, 6 secs later.');
          retryLoadPositionPanel();
        }, 6000);
      }
    } else {
      setSideAreaStatus('You must be signed in to display Candidate information.');
    }
  }, 2000);  // Yuck! Time delays are always a last resort
}

function debugWarn (...args) {
  const {debugLocal} = window;
  if (debugLocal) {
    debugFgLog(...args);
  }
}

/*
  May 16, 2019
  For now if the API server gets swapped from local/production you will need to get a new device ID.
  With the extension running, go to the wevote.us or localhost:3000 page, and open the popup, and press the login button.
  Then when you navigate to some endorsement page. the device id will become available in local storage.
  Sept 10, 2019, you may have to clear storage.local 'voterDeviceId'.  You will have to be running a local webapp, which
  is pointed to a local python server, so that they all share a voterDeviceId.  If you have had a valid voterDeviceId
  in the past, you can get the most recent one form pgAdmin/voter_voterdevicelink and paste it into the value for
  voterDeviceId in the chrome-extension's DevTools Application tab.
 */
// Called on click true, or topbar init false
function signIn (attemptLogin) {
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  debugFgLog('new signIn');
  sendMessage({ command: 'getVoterInfo',},
    function (response) {
      if (lastError) {
        debugFgLog(' chrome.runtime.sendMessage("getVoterInfo")', lastError.message);
      }
      const {success, error, err, voterName, photoURL, weVoteId, voterEmail, isSignedIn} = response.data;
      debugFgLog(' chrome.runtime.sendMessage("getVoterInfo") success', response.data);
      weContentState.voterWeVoteId = weVoteId || '';
      debugFgLog('signIn response: ', response);
      let voterInfo = {
        success: success,
        error: error,
        err: err,
        name: voterName,
        photo: (!photoURL || photoURL.length < 10)
          ? 'https://wevote.us/img/global/icons/avatar-generic.png'
          : photoURL,
        voterId: weVoteId,
        email: voterEmail,
        isSignedIn
      };
      // Unfortunately /avatar-generic.png can't be "served" from the extension, since file loading is relative to the endorsement page

      if (voterInfo.success && voterInfo.isSignedIn) {
        setSignInOutMarkup (voterInfo);
        // handleUpdatedOrNewPositions(true, false, false);
        const interval = setInterval(function (){
          try {
            // debugFgLog('loop update position panel, interval ', interval);
            updatePositionPanelConditionally(true);
          } catch (e) {
            // exception for context invalidated, ie the page refreshed
            debugFgLog('MESSAGING: updatePositionPanelConditionally() loop update stopped on exception ', e, interval);
            clearInterval(interval);
          }
        }, 10000);
        return false;
      }
    }
  );

  if (attemptLogin) {
    const url = extensionSignInPage + '?title=' + encodeURIComponent(document.title);
    window.open(url, '_blank');

    debugFgLog('opened: ', url);
    let stopWaiting = false;
    setTimeout(function (){
      stopWaiting = true;
      debugFgLog('90 seconds to sign in timeout occurred, without having signed in');
    }, 90000);

    const interval = setInterval(function (){
      // debugFgLog('loop weContentState.voterIsSignedIn: ', weContentState.voterIsSignedIn);
      getVoterInfo();
      if (weContentState.voterIsSignedIn || stopWaiting) {
        clearInterval(interval);
      }
    }, 100);
  }
}

function setSignInOutMarkup (voterInfo) {
  const { isSignedIn, photo } = voterInfo;
  const signInSelector = $('#signIn');
  if (isSignedIn) {
    signInSelector.replaceWith(
      '<img id="signIn" class="gridSignInTop voterPhoto removeContentStyles" alt="candidateWe" src="' + photo + '" ' +
      'style="margin: 12px; width: 50px; height: 50px;" />');
    signInSelector.click(() => {
      // We are currently signed in, so this click signs us out
      debugFgLog('Sign out pressed');
      // Removing the stored voterDeviceId deauthenticates us, signs us out, within the chrome extension
      chrome.storage.sync.remove('voterDeviceId', () => {
        if (chrome.runtime.lastError) {
          console.error('chrome.storage.sync.remove(voterDeviceId) failed with', chrome.runtime.lastError.message);
        }
        let voterInfo = {
          isSignedIn: false,
        };
        setSignInOutMarkup(voterInfo);
      });
    });
  } else {
    signInSelector.replaceWith(
      '<button type="button" id="signIn" class="gridSignInTop bareSignIn weButton removeContentStyles">SIGN IN</button>'
    );
    signInSelector.click(() => {
      // We are currently signed out, so this click signs us in
      debugFgLog('Sign in pressed');
      signIn(true);
    });
  }
}

function getVoterInfo () {
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  sendMessage({ command: 'getVoterInfo',},
    function (response) {
      if (lastError) {
        debugFgLog(' chrome.runtime.sendMessage("getVoterInfo")', lastError.message);
      }
      const { success, error, err, voterName, photoURL, weVoteId, voterEmail, isSignedIn } = response.data;
      weContentState.voterWeVoteId = weVoteId || '';
      debugFgLog('signIn response: ', response);
      let voterInfo = {
        success: success,
        error: error,
        err: err,
        name: voterName,
        photo: (!photoURL || photoURL.length < 10) ? 'https://wevote.us/img/global/icons/avatar-generic.png' : photoURL,
        voterId: weVoteId,
        email: voterEmail,
        isSignedIn
      };
      if (success) {
        weContentState.voterIsSignedIn = isSignedIn;
      }

      if (success && isSignedIn) {
        setSignInOutMarkup (voterInfo);
        updatePositionPanelUnconditionally ();
        return true;
      }
      return false;
    }
  );
}

// function dialogTitlebarStyling () {
//   $('.u2i-dialog-titlebar').css('background-color', '#2E3C5D');
//   $('.u2i-icon-closethick').remove();
//   $('.u2i-dialog-titlebar-close').css({
//     'background-color': '#2E3C5D',
//     'color': 'white',
//     'border': '6px'
//   });
//   $('.u2i-button-icon-space').css({
//     'padding-right': '4px',
//   }).html('X&nbsp;');
//   $('.u2i-resizable-handle').css('display', 'none');
//   $('.u2i-dialog-title').addClass('createDlgTitle');
// }

function topMenu () {
  let topMarkup = '' +
    '<div id="topMenuContainer" class="topMenuContainer">' +
    '  <img id="orgLogo" class="gridOrgIcon" src="https://wevote.us/img/endorsement-extension/endorsement-icon48.png" alt="">' +
    '  <div id="orgName" class="gridOrgName core-text"></div>' +
    '  <span class="gridSend">' +
    '    <span class="innerGridSend core-text">' +
    '      <span class="topCommentLabel core-text">Send us a comment about this page: </span>' +
    '      <input type="text" id="emailWe" class="core-text" name="email" placeholder="Your email" >' +
    '      <input type="text" id="topComment" class="core-text" name="topComment" placeholder="Comment here..." >' +
    '      <button type="button" id="sendTopComment" class="sendTopComment weButton u2i-button u2i-widget u2i-corner-all removeContentStyles">Send</button>' +
    '    </span>' +
    '  </span>' +
    '  <button type="button" id="signIn" class="gridSignInTop bareSignIn weButton removeContentStyles">SIGN IN</button>' +
    '  <span id="loginPopUp"></span>' +
    '  <div id="dlgAnchor"></div>' +
  '</div>';
  $('#topMenu').append(topMarkup);

  let voterInfo = {
    isSignedIn: false,     // Start off as not signed in, call setSignInOutMarkup to set the click listener
  };

  setSignInOutMarkup (voterInfo);
}

// Get the href into the extension
function getHighlights (highlighterEnabledThisTab, highlighterEditorEnabled, tabId) {
  const timingLogDebug = false;
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  const t0 = performance.now();
  debugFgLog('ENTERING contentWeVoteUI > getHighlights() called ========================== highlighterEnabledThisTab: ', highlighterEnabledThisTab,
    ', highlighterEditorEnabled: ', highlighterEditorEnabled, ', tabId: ', tabId);
  let urlToQuery = $('input[name="pdfFileName"]').val();  // This is for PDFs that have been converted to HTML
  if (!urlToQuery || urlToQuery.length < 1) {
    urlToQuery = window.location.href;
  }
  // TODO: We need to send both urls, html and pdf to the server

  // Start by just retrieving the endorsements already captured
  getVoterDeviceId().then((voterDeviceId) => {
    console.log('**************** before send message getHighlights in getVoterDeviceId(), weContentState.tabId', weContentState.tabId);
    sendMessage({ command: 'getHighlights', url: urlToQuery, 'voterDeviceId': voterDeviceId, tabId: weContentState.tabId, doReHighlight: false },
      function (response) {
        if (lastError) {
          debugFgLog(' chrome.runtime.sendMessage("getHighlights")', lastError.message);
        }
        debugFgLog('RESPONSE in contentWeVoteUI > getHighlights() ========================== response: ', response);
        debugFgLog('getHighlights() response', response);

        if (response) {
          const t1 = performance.now();
          timingLogDebug && timingLog(t0, t1, 'getHighlights took', 8.0);
          debugFgLog('SUCCESS: getHighlights received a response: ', response, '  highlighterEditorEnabled:', highlighterEditorEnabled, ', tabId: ', tabId);
          namesToIds = response.nameToIdMap;  // This one only works if NOT in an iFrame
          if (highlighterEditorEnabled) {
            displayEditPanes();
            timingLogDebug && timingLog(t1, performance.now(), 'displayEditPanes took', 5.0);
          } else {
            // 2/23/20 6pm  This was what finally got highlighting and/or editor woking on command
            // The same endorsement page, when opened in an iframe will immediately reload and must call sendGetStatus from that DOM, at that moment.
            // See the call to sendGetStatus in the initialization code for tabWordHighlighter
            updateTopMenu(false);  // Get the voterGuidePossiblityId without attempting to update the non-existent top menu
          }
          sendGetStatus();

          // By now, the endorsements already captured should be displayed,
          // so we can move on to also showing recognized candidate names
          const t3 = performance.now();
          debugFgLog('sendMESSAGE contentWeVoteUI > getCombinedHighlights command ========================== ');
          const timeoutDuration = 7000;  // 7 seconds so the voterGuidePossibilityHighlightsRetrieve can finish
          debugFgLog('STARTING === 7 Second Delay === contentWeVoteUI > getHighlights > getCombinedHighlights');
          setTimeout(() => {
            // We added a 7 second delay to let the page finish updating from the getHighlights command
            const justSetUpPanels = false;
            // if (isInOurIFrame()) { // if in an iframe
            if (justSetUpPanels) {
              // NOTE FROM DALE: 2020-06-08 This is an attempt to make this work when we are in the Edit panels
              // Does not currently work
              debugFgLog('JUST_SET_UP_PANELS: ');
              retryLoadPositionPanel();
            } else {
              // NOTE FROM DALE: 2020-06-08 This works when we haven't put the organization voter guide in a panel
              sendMessage({command: 'getCombinedHighlights', voterWeVoteId: weContentState.voterWeVoteId, tabId: weContentState.tabId, url: urlToQuery, doReHighlight: true},
                function (response) {
                  if (lastError) {
                    debugFgLog('ERROR: chrome.runtime.sendMessage("getCombinedHighlights")', lastError.message);
                  }
                  debugFgLog('AFTER === 7 Second Delay ===');
                  debugFgLog('RESPONSE in contentWeVoteUI > getCombinedHighlights() ========================== response: ', response);
                  debugFgLog('getCombinedHighlights() response', response);

                  if (response) {
                    const t4 = performance.now();
                    timingLogDebug && timingLog(t3, t4, 'getCombinedHighlights took', 8.0);
                    debugFgLog('SUCCESS: getCombinedHighlights received a response: ', response, '  highlighterEditorEnabled:', highlighterEditorEnabled, ', tabId: ', tabId);
                    namesToIds = response.nameToIdMap;  // This one only works if NOT in an iFrame
                  } else {
                    debugFgLog('ERROR: getCombinedHighlights received empty response');
                  }
                }
              );
            }
          }, timeoutDuration);
        } else {
          debugFgLog('ERROR: getHighlights received empty response');
        }
      });
  });
}

function getRefreshedHighlights (dialogClosed) {
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  debugFgLog('getRefreshedHighlights called');
  getVoterDeviceId().then((voterDeviceId) => {
    console.log('**************** before send message getRefreshedHighlights in getVoterDeviceId(), weContentState.tabId', weContentState.tabId);
    sendMessage({ command: 'getHighlights', url: window.location.href, 'voterDeviceId': voterDeviceId, doReHighlight: true, tabId: weContentState.tabId },
      function (response) {
        if (lastError) {
          debugFgLog(' chrome.runtime.sendMessage("getRefreshedHighlights") ', lastError.message);
        }
        debugFgLog('getRefreshedHighlights() response', response);

        if (response) {
          debugFgLog('SUCCESS: getRefreshedHighlights received a response', response);
          const { highlighterEditorEnabled } = weContentState;
          if (highlighterEditorEnabled) {
            debugFgLog('getRefreshedHighlights reloading iframe (before reload)');
            if (dialogClosed) {
              window.location.reload(true);  // Reload the Editor mode iframe from within the iframe
            } else {
              document.getElementsByClassName('weVoteEndorsementFrame')[0].contentDocument.location.reload(true);  // Works when called from the candidate pane
            }
          } else {
            debugFgLog('getRefreshedHighlights reloading endorsement page (before reload)');
            document.location.reload();  // Reload the endorsement page
          }
        } else {
          debugFgLog('ERROR: getRefreshedHighlights received empty response');
        }
      });
  });
}

// Call into the background script to do a voterGuidePossibilityRetrieve() api call, and return the data, then update the top menu
function updateTopMenu (update) {
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  debugFgLog('updateTopMenu()');
  sendMessage({ command: 'getTopMenuData', url: window.location.href },
    function (response) {
      if (lastError) {
        debugFgLog(' chrome.runtime.sendMessage("getTopMenuData")', lastError.message);
      }
      debugFgLog('updateTopMenu() response', response);

      if (response && Object.entries(response).length > 0) {
        const { orgName, orgLogo, voterGuidePossibilityId, noExactMatchOrgList, twitterHandle, weVoteId, tabId } = response.data;
        weContentState.organizationWeVoteId = weVoteId;
        weContentState.organizationTwitterHandle = twitterHandle;
        weContentState.orgName = orgName;
        weContentState.voterGuidePossibilityId = voterGuidePossibilityId;
        weContentState.possibleOrgsList = noExactMatchOrgList;
        if (tabId > 0) weContentState.tabId = tabId;

        if (update) {
          $('#orgLogo').attr('src', orgLogo);
          $('#orgName').text(orgName ? orgName : 'Organization not found for this URL');
          $('#sendTopComment').click(() => {
            sendTopComment();
          });
          debugFgLog('updateTopMenu voterGuidePossibilityId: ' + weContentState.voterGuidePossibilityId);
        }
        // debugFgLog('updateTopMenu updatePositionPanelConditionally update: ' + update);
        updatePositionPanelConditionally(update);
      } else {
        console.error('ERROR: updateTopMenu received empty response');
      }
    });
}

/* eslint-disable no-unused-vars */
function updateHighlightsIfNeeded (dialogClosed) {
  debugFgLog('ENTERING contentWeVoteUI > updateHighlightsIfNeeded ==========================');
  handleUpdatedOrNewPositions(false, false, false, dialogClosed);
}

function updatePositionPanelUnconditionally () {
  debugFgLog('ENTERING contentWeVoteUI > updatePositionPanelUnconditionally ==========================');
  handleUpdatedOrNewPositions(true, false, false, false);
}

function updatePositionPanelConditionally (update) {
  debugFgLog('ENTERING contentWeVoteUI > updatePositionPanelConditionally ========================== update: ', update);
  handleUpdatedOrNewPositions(update, false, false, false);
}

function preloadPositionsForAnotherVM () {
  debugFgLog('ENTERING contentWeVoteUI > preloadPositionsForAnotherVM ==========================');
  const {location: {ancestorOrigins, origin}} = window;
  if ((ancestorOrigins.length === 0) ||       // Ok to proceed if we have no ancestor origins
      (origin === ancestorOrigins[0])) {      // or if the ancestor origin matches the current origin
    handleUpdatedOrNewPositions(false, true, true, false);
  } else {
    debugFgLog('preload skipped for origin: ', origin);
  }
}

function updatePositionPanelFromTheIFrame (dialogClosed) {
  debugFgLog('ENTERING contentWeVoteUI > updatePositionPanelFromTheIFrame ==========================');
  handleUpdatedOrNewPositions(true, true, false, dialogClosed);
}

function retryLoadPositionPanel () {
  debugFgLog('ENTERING contentWeVoteUI > retryLoadPositionPanel ==========================');
  handleUpdatedOrNewPositions(true, true, true, false);
}
/* eslint-enable no-unused-vars */

function handleUpdatedOrNewPositions (update, fromIFrame, preLoad, dialogClosed) {
  const { runtime: { sendMessage, lastError } } = chrome;
  debugFgLog('ENTERING contentWeVoteUI > handleUpdatedOrNewPositions() getPositions, weContentState.voterGuidePossibilityId: ' + weContentState.voterGuidePossibilityId);

  getVoterDeviceId().then((voterDeviceId) => {
    sendMessage({
      command: 'getPositions',
      voterDeviceId,
      hrefURL: window.location.href,
      isIFrame: isInOurIFrame(),
      voterGuidePossibilityId: weContentState.voterGuidePossibilityId,
      voterWeVoteId: weContentState.voterWeVoteId
    },
    function (response) {
      if (lastError) {
        debugFgLog(' chrome.runtime.sendMessage("getPositions")', lastError.message);
      }
      debugFgLog('RESPONSE in contentWeVoteUI > handleUpdatedOrNewPositions() getPositions, response:', response);
      debugFgLog('handleUpdatedOrNewPositions() response', response);
      if ((response && Object.entries(response).length > 0) && (response.data !== undefined) && (response.data.length > 0)) {
        let {data} = response;
        // debugFgLog('--------------- handleUpdatedOrNewPositions: booleans, response and previous', update, fromIFrame, preLoad, data, weContentState.priorData);
        if (!preLoad && !hasCandidateDataChanged(data)) {
          // debugFgLog('handleUpdatedOrNewPositions -------------- no change in data, aborting update of positions panel');
          return;
        }

        if (update && !fromIFrame) {
          $('.candidateWe').remove();   // Remove all the existing candidates, and then redraw them
          coreUpdatePositions(data, update);
        }

        weContentState.priorData = data;
        if (fromIFrame && !preLoad) {
          getRefreshedHighlights(dialogClosed);
        }
      } else {
        // This is not necessarily an error, it could be a brand new voter guide possibility with no position possibilities yet.
        debugFgLog('EXITING contentWeVoteUI > handleUpdatedOrNewPositions(), NOTE: getPositions returned an empty response or no data element.');
      }
    });
  });
}

function hasCandidateDataChanged (data) {
  if (data.length !== weContentState.priorData.length) {
    return true;
  }
  for (let i =0; i< data.length; i++) {
    if (data[i].position_stance !== weContentState.priorData[i].position_stance) {
      return true;
    }
    if (data[i].statement_text !== weContentState.priorData[i].statement_text) {
      return true;
    }
    if (data[i].more_info_url !== weContentState.priorData[i].more_info_url) {
      return true;
    }
  }
  return false;
}

function coreUpdatePositions (data, update) {
  let names = [];
  let positions = [];
  weContentState.positionsCount = data.length;
  let selector = $('#sideArea');
  if (weContentState.positionsCount > 0) {
    setSideAreaStatus();
    let insert = 0;
    let allHtml = $('#noDisplayPageBeforeFraming').html();
    for (let i = 0; i < weContentState.positionsCount; i++) {
      debugFgLog('coreUpdatePositions data: ', data[i]);
      // be sure not to use position_stance_stored, statement_text_stored, or more_info_url_stored -- we want the possibilities, not the live data
      let {
        ballot_item_name: name, candidate_alternate_names: alternateNames, position_stance: stance, statement_text: comment, more_info_url: url,
        political_party: party, office_name: officeName, ballot_item_image_url_https_large: imageURL, position_we_vote_id: positionWeVoteId,
        candidate_we_vote_id: candidateWeVoteId, google_civic_election_id: googleCivicElectionId, office_we_vote_id: officeWeVoteId,
        organization_we_vote_id: organizationWeVoteId, possibility_position_id: possibilityPositionId, organization_name: organizationName,
        voter_guide_possibility_id: voterGuidePossibilityId
      } = data[i];

      if (!name) {
        // Note October 2019: This is a little risky, since it assumes the first one is the best one
        debugFgLog('Skipping right position panel blank name: ', data[i]);
        // eslint-disable-next-line no-continue
        continue;
      }
      if (names.includes(name.toLowerCase())) {
        // Note October 2019: This is a lttle risky, since it assumes the first one is the best one
        debugFgLog('Skipping right position panel duplicate name "' + name + '", index = ' + insert);
        // eslint-disable-next-line no-continue
        continue;
      }
      names.push(name.toLowerCase());

      weContentState.organizationWeVoteId = organizationWeVoteId;

      let position = {
        name,
        alternateNames,
        party,
        office: officeName ? officeName : '',
        photo: (imageURL && imageURL.length > 0) ? imageURL : defaultImage,
        comment: (comment && comment.length) ? comment : '',
        stance,
        url: url ? url : '',
        candidateWeVoteId,
        googleCivicElectionId,
        officeWeVoteId,
        organizationWeVoteId,
        organizationName,
        possibilityPositionId,
        positionWeVoteId,
        voterGuidePossibilityId,
      };

      let offs = 0;
      if (update && allHtml) {     // Does not exist if we have not re-opened the page in a frame
        offs = allHtml.indexOf(name);
        for (let j = 0; j < alternateNames.length && offs < 0; j++) {
          offs = allHtml.indexOf(alternateNames[j]);
        }
      }

      positions.push({
        position,
        selector,
        insert,
        sortOffset: offs,
      });
      insert++;
    }
  }

  if (update) {
    // eslint-disable-next-line arrow-body-style
    positions.sort((a, b) => {
      return a.sortOffset > b.sortOffset ? 1 : -1;
    });
  }
  weContentState.positions = positions;

  if (update) {
    for (let k = 0; k < positions.length; k++) {
      const {position, selector} = positions[k];
      rightPositionPanes(k, position, selector);
    }
    attachClickHandlers();
  }
}

function rightPositionPanes (i, candidate, selector) {
  const { name, comment, url, positionWeVoteId,  } = candidate;
  let dupe = $(".candidateName:contains('" + name + "')").length;
  debugFgLog('rightPositionPanes -- i: ' + i + ', ' + name);
  let furlNo = 'furlable-' + i;
  let candNo = 'candidateWe-' + i;
  if (name === null || name.length === 0) {
    debugWarn('rightPositionPane rejected index: ' + i + ', positionWeVoteId: ' + positionWeVoteId +
      ', positionWeVoteId: ' + positionWeVoteId);
    return false;
  }
  if (!dupe) {
    $(selector).append(candidatePaneMarkup(candNo, furlNo, i, candidate, false));
    $('.statementText-' + i).val(comment);
    $('.moreInfoURL-' + i).val(url).css('height: unset !important;');
    return true;
  } else {
    debugFgLog('Found duplicate voterGuidePossibility candidate ... indicates data problem.');
  }
  return false;
}

function candidatePaneMarkup (candNo, furlNo, i, candidate, detachedDialog) {
  // debugFgLog("candidatePaneMarkup ",detachedDialog, candidate);
  let { party, name, alternateNames, photo, office, comment, candidateWeVoteId, voterGuidePossibilityId, positionWeVoteId,
    possibilityPositionId, organizationWeVoteId, organizationName, googleCivicElectionId, stance, description } = candidate;
  if (party === undefined) {
    party = (detachedDialog) ? 'Party: Not specified' :'No match for any current candidate.';
  }
  let allNames = [];
  allNames.push(name);
  let aliases = '';
  if (alternateNames) {
    for (let i = 0; i < alternateNames.length; i++) {
      allNames.push(alternateNames[i]);
      if (alternateNames.length) {
        if (alternateNames.length === 1) {
          aliases = '[ ' +  alternateNames[i] + ' ]';
        } else if (i===0) {
          aliases = '[ ' +  alternateNames[i] + ', ';
        } else if (i === alternateNames.length -1) {
          aliases += alternateNames[i] + ' ]';
        } else {
          aliases += alternateNames[i] + ', ';
        }
      }
    }
  }

  let inLeftPane = false;
  for (let i = 0; i < allNames.length; i++) {
    inLeftPane = $('*:contains(' + allNames[i] + ')').length > 0 ? true : inLeftPane;
  }

  const isStored = positionWeVoteId !== undefined && positionWeVoteId !== null && positionWeVoteId.length > 0;
  let markup =
    "<div class='candidateWe " + candNo + "'>" +
    "  <div id='unfurlable-" + i + "' class='" + (detachedDialog ? 'unfurlableDetached' : 'unfurlable') + "'>" +
         unfurlableGrid(i, name, photo, party, office, description, inLeftPane, detachedDialog, stance, isStored, comment.trim().length > 0, false) +
    "    <input type='hidden' id='candidateName-" + i + "' value='" + name + "'>" +
    "    <input type='hidden' id='candidateWeVoteId-" + i + "' value='" + candidateWeVoteId + "'>" +
    "    <input type='hidden' id='voterGuidePossibilityId-" + i + "' value='" + voterGuidePossibilityId + "'>" +
    "    <input type='hidden' id='positionWeVoteId-" + i + "' value='" + positionWeVoteId + "'>" +
    "    <input type='hidden' id='possibilityPositionId-" + i + "' value='" + possibilityPositionId + "'>" +
    "    <input type='hidden' id='organizationWeVoteId-" + i + "' value='" + organizationWeVoteId + "'>" +
    "    <input type='hidden' id='organizationName-" + i + "' value='" + organizationName + "'>" +
    "    <input type='hidden' id='googleCivicElectionId-" + i + "' value='" + googleCivicElectionId + "'>" +
    "    <input type='hidden' id='allNames-" + i + "' value='" + allNames + "'>" +
    "    <input type='hidden' id='isStored-" + i + "' value='" + isStored + "'>" +
    '  </div>' +
    '  <div id= ' + furlNo + " class='furlable' " + (detachedDialog ? '' : 'hidden') + '>' +
    "    <div class='core-text aliases'>" + aliases + '</div>' +
    "    <span class='buttons'>" +
           supportButton(i, 'endorse', stance) +
           supportButton(i, 'oppose', stance) +
           supportButton(i, 'info', stance) +
    '    </span>' +
    "    <textarea rows='6' class='statementText-" + i + " removeContentStyles' style='margin: 0; text-align: left;'/>" +
    '    <br><span class="core-text" style="margin: 0; text-align: left;">If dedicated candidate page exists, enter URL here:</span>' +
    '    <input type="text" class="moreInfoURL-' + i + ' weInfoText removeContentStyles" style="margin: 0; text-align: left;" />' +
    "    <span class='buttons'>";
  if (!detachedDialog) {
    markup +=
    "      <button type='button' class='revealLeft-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>REVEAL</button>";
  }
  markup +=
    "      <button type='button' class='openInAdminApp-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>ADMIN APP</button>";
  if (party !== undefined && detachedDialog) {
    markup +=
      "    <button type='button' class='openInWebApp-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>JUMP TO WE VOTE</button>";
  }
  markup +=
    "      <button type='button' class='deleteButton-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>DELETE</button>" +
    "      <button type='button' class='saveButton-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>SAVE</button>" +
    '    </span>' +
    '  </div>' +
    '</div>';
  return markup;
}

// eslint-disable-next-line complexity
function unfurlableGrid (index, name, photo, party, office, description, inLeftPane, detachedDialog, stance, isStored, showComment, iconOnly) {
  let iconContainer = '';

  if (!detachedDialog && !inLeftPane) {
    iconContainer =
      '<div id="iconContainer-' + index + '" class="iconContainer">' +
      '  <svg class="warningSvg">' +
      '    <path d="M0 0h24v24H0z" fill="none"/>' +
      '    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>' +
      '  </svg>' +
      '</div>';
  }

  // eslint-disable-next-line no-nested-ternary
  const type = (stance === 'OPPOSE') ? 'oppose' : 'endorse';
  const showThumb = stance !== 'NO_STANCE';
  const showSomething = !detachedDialog;
  const showBar = showThumb && showComment;
  const viewBoxComment = showBar ? '"0 0 22 22"' : '"0 0 24 24"';
  const showThumbOnly = showThumb && !showComment;
  const showCommentOnly = !showThumb && showComment;
  const showOnlyClass = (showCommentOnly ? 'commentOnly' : '') + (showThumbOnly ? 'thumbOnly' : '') + (stance === 'NO_STANCE' && !showComment ? 'emptyInfo' : '');

  if (showSomething && inLeftPane) {
    iconContainer +=
        '<div id="iconContainer-' + index + '" class="iconContainer ' + showOnlyClass + '" style="background-color:' + backgroundColor(stance, isStored) + '">';
    if (showThumb) {
      iconContainer += markupForThumbSvg ('thumbIconSVG', type, 'white');
    }
    if (showBar) {
      iconContainer +=
        '  <div style="transform: translate(19px, -26px); color: white; font-size: 10pt; background-color:' + backgroundColor(stance, isStored) + '; width: 2px;">&#124;</div>';
    }
    if (showComment) {    // https://material.io/resources/icons/?style=baseline comment
      iconContainer +=
        '  <svg class="commentIconSVG ' + (showCommentOnly ? 'commentIconOnly' : '') + '" style="margin-top:3px; background-color:' + backgroundColor(stance, isStored) + ';" viewBox=' + viewBoxComment + '>' +
        '    <path fill="white" d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>' +
        '    <path d="M0 0h24v24H0z" fill="none"/>' +
        '  </svg>';
    }
    iconContainer +=
       '</div>';
  }

  let markup =
    '<div class="' + (detachedDialog ? 'gridUnfurlableContainerDetached' : 'gridUnfurlableContainer') + ' core-text">' +
      '<div class="gridCandidatePhoto">' +
        '<img class="photoWe removeContentStyles" alt="candidateWe" src="' + photo + '">' +
      '</div>' +
        (detachedDialog ? ('<input type="text" class="candidateNameInput-' + index + '" />') : ('<div class="gridCandidateName">' + name + '</div>')) +
        '<div class="gridIcon">' +
            iconContainer +
        '</div>' +
      '<div class="gridCandidateParty">' + party + '</div>' +
      '<div class="gridOfficeTitle">' + office + '</div>' +
      (detachedDialog ? '<div class="gridCandidateDesc" id="descriptionId-' + index + '" >' + description + '</div>' : '') +
    '</div>';

  if (iconOnly) {
    markup = iconContainer;
  }

  return markup;
}

/* eslint-disable no-undef */
function backgroundColor (stance, isStored) {
  if (stance === 'SUPPORT') {
    return isStored ? colors.STORED_SUPPORT_BACKGROUND : colors.POSS_SUPPORT_BACKGROUND;
  }
  if (stance === 'OPPOSE') {
    return isStored ? colors.STORED_OPPOSE_BACKGROUND : colors.POSS_OPPOSE_BACKGROUND;
  }
  if (stance === 'NO_STANCE') {
    return colors.POSS_INFO_BACKGROUND;
  }

  return 'purple';
}
/* eslint-enable no-undef */

function greyAllPositionPanes (booleanGreyIt) {
  if (booleanGreyIt) {
    $('div.candidateWe').css('opacity', '0.25');
  } else {
    $('div.candidateWe').css('opacity', '1');
  }
}

function selectOneDeselectOthers (type, targetFurl) {
  let buttons = $(targetFurl).find(':button');
  buttons.each((i, but) => {
    const { className } = but; // "infoButton-2 weButton removeContentStyles deselected"
    // eslint-disable-next-line prefer-destructuring
    const number = className.match(/-(\d*)\s/)[1];

    const iterationType = className.substring(0, className.indexOf('Button'));
    switch (iterationType) {
      case 'endorse':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'SUPPORT': '');
        break;
      case 'oppose':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'OPPOSE': '');
        break;
      case 'info':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'INFO_ONLY': '');
        break;
    }
  });
}

// We are only updating possiblilities here, we are not changing the "stored" live presentation data
function saveUpdatedCandidatePossiblePosition (event, removePosition, detachedDialog) {
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  const targetCand = event.currentTarget.className; // div.candidateWe.candidateWe-4
  const targetFurl = '#' + targetCand.replace('candidateWe candidateWe', 'furlable');
  // eslint-disable-next-line prefer-destructuring
  const number = targetFurl.match(/-(\d*)\s/)[1];
  const buttonContainerId = detachedDialog ? '#1000' : '#furlable-' + number;
  const buttons = $(buttonContainerId).find(':button');
  let stance = 'NO_STANCE';
  const remove = removePosition;

  buttons.each((i, but) => {
    const {className} = but;   // "infoButton-2 weButton removeContentStyles deselected"
    if (className.match(/endorse.*?selectedEndorsed/)) {
      stance = 'SUPPORT';
    } else if (className.match(/oppose.*?selectedOpposed/)) {
      stance = 'OPPOSE';
    } else if (className.match(/info.*?selectedInfo/)) {
      // 9/16/19: Dale says 'INFO_ONLY' should be saved as 'NO_STANCE' in this situation
      stance = 'NO_STANCE';
    }
  });

  const itemName = detachedDialog ? $('.candidateNameInput-1000').val() : '';
  const voterGuidePossibilityPositionId = detachedDialog ? 0 : $('#possibilityPositionId-' + number).val();
  const statementText = $('.statementText-' + number).val().trim();
  const moreInfoURL = $('.moreInfoURL-' + number).val().trim();
  const isStored =  $('.isStored-' + number).val();
  // Since we might have changed the stance and/or comment, update the right icon in the unfurlable grid
  const inLeftPane = true;
  const iconOnly = true;
  let iconContainer = unfurlableGrid (number, '', '', '', '', '', inLeftPane, detachedDialog, stance, isStored, statementText.length > 0, iconOnly);
  $('#iconContainer-' + number).wrap('<p/>').parent().html(iconContainer);

  sendMessage({
    command: 'savePosition',
    itemName,
    voterGuidePossibilityId: weContentState.voterGuidePossibilityId,
    voterGuidePossibilityPositionId,
    stance,
    statementText,
    moreInfoURL,
    removePosition,
  },
  function (response) {
    if (lastError) {
      debugFgLog(' chrome.runtime.sendMessage("savePosition")', lastError.message);
    }
    debugFgLog('saveUpdatedCandidatePossiblePosition() response', response);

    if (detachedDialog) {
      $('div.ui-dialog').remove();
      setSideAreaStatus();
      updatePositionPanelUnconditionally();
    } else {
      debugFgLog(remove);
      if (remove) {
        $(`.candidateWe-${number}`).remove();
      } else {
        const furlables = $('.furlable');
        const thisDiv = $('#furlable-' + number);
        const lastDiv = furlables[furlables.length - 1];
        let forceNumber = Number(number);
        forceNumber = (thisDiv[0] === lastDiv) ? 0 : forceNumber + 1;
        for (let i = 0; i < 10; i++) {
          if ($('#furlable-' + forceNumber).length === 0) {
            forceNumber++;      // skip any missing elements
          } else {
            break;
          }
        }
        deactivateActivePositionPane();
        unfurlOnePositionPane(null, forceNumber);
      }
    }
    // Here we are still in the response from 'savePosition'.  After a successful save on the right side (voterGuidePossibilityPositionSave in backgroundWeVoteAPICalls)
    // return here (the left side) and after advancing the open pane (above), call getRefreshedHighlights() (below) to send a 'getHighlights' message to the right side
    // (extWordHighlighter) with a doReHighlight: true.  This will invoke getHighlightsListsFromApiServer this will make an API call
    // to /voterGuidePossibilityHighlightsRetrieve?, upon return from the API call, it will call initializeHighlightsData() (in backgroundWeVoteApiCalls)
    // to sort and process the raw highlights data, and then with doReHighlight true, will call requestReHighlight() which will then
    // send a message back to here (contentWeVoteU which is on the left side) with the processed data to do the re-highlighting.

    // 9/26/19:  The messaging all works, but the dom in the iframe is inaccessible at this point, will go with the
    // iframe reload (within getRefreshedHighlights) as a work around for now.
    // removeAllHighlights();

    getRefreshedHighlights();
  });
}

function unfurlOnePositionPane (event, forceNumber) {
  let targetFurl = '';
  let number = -1;
  if (forceNumber > -1) {
    targetFurl = '#furlable-' + forceNumber;
    number = forceNumber;
  } else {
    const targetCand = event.currentTarget.className; // div.candidateWe.candidateWe-4
    targetFurl = '#' + targetCand.replace('candidateWe candidateWe', 'furlable');
    number = targetFurl.substring(targetFurl.indexOf('-') + 1);
    let selectorForName = '#' + event.currentTarget.classList[1].replace('candidateWe', 'candidateName');
    weContentState.candidateName = $(selectorForName).val();
    let selectorForAllNames = '#' + event.currentTarget.classList[1].replace('candidateWe', 'allNames');
    weContentState.allNames = $(selectorForAllNames).val();
  }
  const element = document.getElementById('unfurlable-' + number);
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); // alignTioTop
  $(targetFurl)[0].scrollIntoView();
  addHandlersForCandidatePaneButtons(targetFurl, number, false);
  $(targetFurl).removeAttr('hidden');
}

function addHandlersForCandidatePaneButtons (targetDiv, number, detachedDialog) {
  let buttons = $(targetDiv).find(':button');
  buttons.each((i, but) => {
    const { className } = but;
    if (className.startsWith('endorse')) {
      $(but).click(() => {
        selectOneDeselectOthers('endorse', targetDiv);
      });
    } else if (className.startsWith('oppose')) {
      $(but).click(() => {
        selectOneDeselectOthers('oppose', targetDiv);
      });
    } else if (className.startsWith('info')) {
      $(but).click(() => {
        selectOneDeselectOthers('info', targetDiv);
      });
    } else if (className.startsWith('revealLeft')) {
      $(but).click((event) => {
        event.stopPropagation();
        // Try each name, hopefully only one will be on the screen, if not we will end up at the last matching name
        let aliases = weContentState.allNames.split(',');
        for (let i = 0; i < aliases.length; i++) {
          const emphasizedElement = $('#frame:first').contents().find(':contains(' + aliases[i] + '):last');
          if (emphasizedElement.length) {
            $(emphasizedElement)[0].scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
        }
      });
    } else if (className.startsWith('openInAdminApp-')) {
      $(but).click((event) => {
        event.stopPropagation();
        let candidateName = $('#candidateName-' + number).val();
        candidateName = encodeURIComponent(candidateName);
        let URL = 'https://api.wevoteusa.org/c/?show_all_elections=1&hide_candidate_tools=0&page=0&state_code=' +
          '&candidate_search=' + candidateName + '&show_all_elections=False';
        window.open(URL, '_blank');
      });
    } else if (className.startsWith('openInWebApp-')) {
      $(but).click((event) => {
        event.stopPropagation();
        const candidateWeVoteId = $('#candidateWeVoteId-' + number).val();
        if (candidateWeVoteId.length) {
          let URL = 'https://wevote.us/candidate/' + candidateWeVoteId + '/b/btdo/';
          window.open(URL, '_blank');
        }
      });
    } else if (className.startsWith('deleteButton')) {
      $(but).click((event) => {
        event.stopPropagation();
        let removePosition = true;
        saveUpdatedCandidatePossiblePosition(event, removePosition, detachedDialog);
      });
    } else if (className.startsWith('saveButton')) {
      $(but).click((event) => {
        const removePosition = false;
        event.stopPropagation();
        saveUpdatedCandidatePossiblePosition(event, removePosition, detachedDialog);
      });
    }
  });
}

function deactivateActivePositionPane () {
  const visibleElements = $('.furlable:visible');
  if (visibleElements.length > 0) {
    // debugFgLog('deactivateActivePositionPane() visibleElements: ',visibleElements);
    // eslint-disable-next-line prefer-destructuring
    let visibleElement = visibleElements[0];
    let visibleElementId = visibleElement.id;
    let buttons = $('#' + visibleElementId + ' :button');
    buttons.unbind();
    $('#' + visibleElementId).attr('hidden', true);
    debugFgLog('deactivateActivePositionPane() buttons: ', buttons);  // Do not remove
  } else {
    debugFgLog('deactivateActivePositionPane() -- No open panes');    // Do not remove
  }
}

// The text they select, will need to be the full name that we send to the API, although they will have a chance to edit it, before sending
// eslint-disable-next-line no-unused-vars
function openSuggestionPopUp (selection) {
  $('[role=dialog]').remove();  // Only one suggestion dialog at a time is allowed, so close any previous
  const frameUrl = addCandidateExtensionWebAppURL + '?candidate_name=' + encodeURIComponent(selection) +
    '&candidate_we_vote_id=&endorsement_page_url=' + encodeURIComponent(location.href) +
    '&candidate_specific_endorsement_url=';
  debugFgLog('openSuggestionPopUp addCandidateForExtension frameUrl', frameUrl);

  $('<iframe id="weIFrame" src="' + frameUrl + '" style="width: 448px" name="weIframeByName"></div>').dialog({
    title: 'iframe from contentWeVoteUI',
    show: true,
    width: 450,
    height: 600,
    resizable: false,
    fixedDimensions: true,
    closeText: ''
  });

  $('[role=dialog]').css({
    '-webkit-box-shadow': '10px 10px 5px 0px rgba(0,0,0,0.4)',
    '-moz-box-shadow': '10px 10px 5px 0px rgba(0,0,0,0.4)',
    'box-shadow': '10px 10px 5px 0px rgba(0,0,0,0.4)'
  }).attr('id', 'weVoteModal');
  $('.u2i-dialog-titlebar').css({
    backgroundColor: '#2e3c5d',
    color: '#fff',
    height: '30px',
  });
  $('.u2i-icon-closethick').remove();
  $('.u2i-dialog-titlebar-close').css({
    transform: 'translate(-10px, 2px)',
    height: '10px',
    width: '10px',
    backgroundColor: '#2e3c5d',
    color: 'white',
    float: 'right',
    border: 'none',
  });
  $('.u2i-button-icon-space').css({
    fontWeight: 'bolder',
    fontStretch: 'extra-expanded',
    fontSize: '12pt',
  }).html('X&nbsp;');
  $('.u2i-dialog-title').css({
    float: 'left',
    marginLeft: '8px',
    marginTop: '2px',
  });
  $("[name='weIframeByName']").css({
    width: '450px',
    height: '600px',
  });
  $('.u2i-resizable-handle').css('display', 'none');

  $('div.u2i-dialog').on('dialogclose', () => {
    $('div.u2i-dialog').remove();
  });
}

function supportButton (i, type, stance) {
  let buttonText = '';
  let fillColor = '';
  let selectionStyle = '';
  let textClass = '';
  if (type === 'endorse') {
    buttonText = 'ENDORSED';
    textClass = 'supportButtonText';
    if (stance === 'SUPPORT') {
      fillColor = 'white';
      selectionStyle = 'selectedEndorsed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else if (type === 'oppose') {
    buttonText = 'OPPOSED';
    textClass = 'supportButtonText';
    if (stance === 'OPPOSE') {
      fillColor = 'white';
      selectionStyle = 'selectedOpposed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else {
    buttonText = 'INFO ONLY';
    textClass = 'supportButtonTextNoIcon';
    if (stance === 'INFO_ONLY' || stance === 'NO_STANCE') {
      fillColor = 'white';
      selectionStyle = 'selectedInfo';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  }

  let markup = "<button type='button' class='" + type + 'Button-' + i + ' weButton removeContentStyles ' + selectionStyle + "'>";
  markup += markupForThumbSvg('supportButtonSVG', type, fillColor);
  markup += "<span class='" + textClass + "'>" + buttonText + '</span></button>';

  return markup;
}

function toggleSupportButton (button, i, type, stance) {
  const svg = $(button.find('path')[0]);
  if (type === 'endorse') {
    if (stance === 'SUPPORT') {
      button.removeClass('deselected').addClass('selectedEndorsed');
      svg.attr('fill', '#FFFFFF');  // Modify the SVG thumb color to be white
    } else {
      button.removeClass('selectedEndorsed').addClass('deselected');
      svg.attr('fill', '#235470');
    }
  } else if (type === 'oppose') {
    if (stance === 'OPPOSE') {
      button.removeClass('deselected').addClass('selectedOpposed');
      svg.attr('fill', '#FFFFFF');  // Modify the SVG thumb color to be white
    } else {
      button.removeClass('selectedOpposed').addClass('deselected');
      svg.attr('fill', '#235470');
    }
  } else if (stance === 'INFO_ONLY' || stance === 'NO_STANCE') {
    button.removeClass('deselected').addClass('selectedInfo');
  } else {
    button.removeClass('selectedInfo').addClass('deselected');
  }
}

function isParentFurlable (target) {
  const { classname } = target;
  if (classname === 'furlable') {
    return true;
  }
  let i = 0;
  let scan = target;
  while(scan && scan.id !== 'sideArea' && scan.className !== 'furlable') {
    scan = scan.parentElement;
    if(i++ > 10) {
      break;
    }
  }
  return scan && (scan.className === 'furlable');
}

function attachClickHandlers () {
  //debugFgLog("attachClickHandlers", $('div.candidateWe').length);

  $('div.candidateWe').click((event) => {
    if (!isParentFurlable(event.target)) {
      deactivateActivePositionPane();
      unfurlOnePositionPane(event, -1);
    } else {
      debugWarn('candidateWe click IGNORED since target is in furlable area', event);
    }
  });
}

function orgChoiceDialog (orgList) {
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  debugFgLog('ENTERING building orgChoiceDialog');
  const sortedList = sortURLs(orgList);
  let markup =
    '<div id="orgChoiceDialog" class="removeContentStyles" style="background-color: rgb(255, 255, 255)">' +
    '  <div class="chooseSubTitles">This endorsement page does not have an exact match in our database.</div>' +
    '  <div class="chooseSubTitles"><b>Please select one of the choices below.</b></div>' +
    '  <table id="orgSelection">';
  sortedList.forEach((item) => {
    const { organization_we_vote_id: id, organization_name: name, organization_website: url } = item;
    let dispUrl = (url.length < 45) ? url : url.substring(0, 45) + '...';
    markup +=
      '  <tr class="topTd">' +
      '    <td><button type="button" id="orgChoice-' + id + '" class="orgChoiceButton weButton">' + name + '</button></td>' +
      '  </tr>' +
      '  <tr class="bottomTd">' +
      '    <td><a id="externalLink" href="' + url + '" target="_blank">' + dispUrl + '</a>' +
      '  </tr>';
  });
  markup +=
    '  </table>' +
    '</div>';

  setSideAreaStatus();
  $('#sideArea').append(markup);
  $('.orgChoiceButton').each((i, but) => {
    $(but).click((event) => {
      const {id} = event.currentTarget;
      const {href} = window.location;
      let organizationWeVoteId = id.substring(id.indexOf('-') + 1);

      debugFgLog('orgChoiceDialog voterGuidePossibilitySave, orgChoiceButton button onclick:  ' + event.currentTarget.id);
      sendMessage({
        command: 'voterGuidePossibilitySave',
        organizationWeVoteId: organizationWeVoteId,
        voterGuidePossibilityId: weContentState.voterGuidePossibilityId,
        internalNotes: 'Proposed endorsement page: ' + href,
        voterWeVoteId : weContentState.voterWeVoteId,
      },
      function (res) {
        if (lastError) {
          debugFgLog(' chrome.runtime.sendMessage("setSideAreaStatus voterGuidePossibilitySave")', lastError.message);
        }
        debugFgLog('setSideAreaStatus voterGuidePossibilitySave() response', res);
        const{ organization_we_vote_id: id } = res.res.organization;
        if (id && id.length) {
          updateTopMenu(true);
          $('#orgChoiceDialog').remove();  // Remove this selection menu/dialog
          setSideAreaStatus('No Candidate endorsements have been captured yet for this endorsement page.');
        }
      });
    });
  });
}

function sendTopComment () {
  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  debugFgLog('ENTERING sendTopComment voterGuidePossibilitySave, orgChoiceDialog button onclick:  ' + event.currentTarget.id);
  sendMessage({
    command: 'voterGuidePossibilitySave',
    organizationWeVoteId: weContentState.organizationWeVoteId,
    voterGuidePossibilityId: weContentState.voterGuidePossibilityId,
    internalNotes: $('#topComment').val(),
    contributorEmail: $('#emailWe').val(),
    voterWeVoteId : weContentState.voterWeVoteId,
  },
  function (res) {
    if (lastError) {
      debugFgLog(' chrome.runtime.sendMessage("sendTopComment voterGuidePossibilitySave")', lastError.message);
    }
    debugFgLog('sendTopComment voterGuidePossibilitySave() response', res);
    $('#dlgAnchor').dialog({
      show: true,
      width: 330,
      height: 65,
      resizable: false,
      fixedDimensions: true,
      position: { my: 'right top', at: 'left bottom', of: '#sendTopComment' },
      open: function () {
        const markup = '<div class="core-text" style="text-align: center; font-size: large; padding-top: 10px;">Thank you for your help!</div>';
        $(this).html(markup);
      },
    });
  });
}

function sortURLs (orgList) {
  const {href} = window.location;
  orgList.forEach((item) => {
    const { organization_website: url } = item;
    // eslint-disable-next-line no-undef
    item.similarity = compareTwoStrings(href, url);
  });

  orgList.sort(function (a, b) {
    return (a.similarity < b.similarity) ? 1 : -1;
  });

  return orgList;
}

function setSideAreaStatus (text) {
  if (!text || text.length === 0) {
    $('#sideAreaStatus').remove();
  } else if ($('#sideAreaStatus').length === 0) {
    $('#sideArea').append('<div id="sideAreaStatus">' + text + '</div>');
  }
}
