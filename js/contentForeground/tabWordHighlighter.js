// Content scripts are the only component of an extension that has access to the web-page's DOM. (this js file and contentWeVoteUI!)
// Chrome extensions Treat these as the contact script, and create nn instance of a pair of them, for every tab which the background Scripps communicate.
// As far as logging and access is concerned, these are part of the DOM and JavaScript of the endorsement page.
// These log to the console of the endorsement page (like sierraclub.org) in the browser, And communicate with the background script via chrome extension messages that are sent.
// When the endorsement page is re-opened in an iframe, access to that DOM is greatly limited.

/* global chrome, preloadPositionsForAnotherVM, updatePositionPanelFromTheIFrame, updateHighlightsIfNeeded, isModalDisplayed */

/* eslint no-unused-vars: 0 */
/* eslint init-declarations: 0 */
/* eslint no-empty-function: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-mixed-operators: 0 */
/* eslint no-undef: 0 */
/* eslint multiline-ternary: 0 */
/* eslint no-ternary: 0 */
// import jQuery from 'libs/jquery/jquery-3.6.0';

let wordsArray = [];
let namesToIds;
let ReadyToFindWords = true; //indicates if not in a highlight execution

let Highlight=true; // indicates if the extension needs to highlight at start or due to a change. This is evaluated in a loop
let HighlightLoopFrequency=300; // the frequency of checking if a highlight needs to occur
let HighlightLoop;
let HighlightWarmup=300; // min time to wait before running a highlight execution

let wordsReceived = false;
let searchEngines = {
  'google.com': 'q',
  'bing.com': 'q'
};
let markerCurrentPosition = -1;
let markerPositions = [];
let highlightMarkers = {};
let markerScroll = false;
let printHighlights = true;
let voterInfo = {};
let uniqueNameMatches = [];
let voterDeviceId = '';
let debug = false;
let urlsForHighlights = {};

// importScripts(
//   'libs/jquery/jquery-3.6.0',
// );
// const jq = chrome.runtime.getURL('libs/jquery/jquery-3.6.0');
// const script = document.createElement('img');
// img.src = chrome.runtime.getURL('logo.png');
// document.body.append(img);
// const $ = jQuery;

document.addEventListener('DOMContentLoaded', async function () {  // This wastes about 1 ms for every open tab in the browser, that we are not going to highlight on
  const t0 = performance.now();
  if (jQuery === undefined) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('./libs/jquery/jquery-3.6.0.min.js');
    script.type = 'text/javascript';
    document.body.append(script);
  }
  console.log(`jQuery ${$.fn.jquery} has been loaded successfully!`);
  // use jQuery below
  await initializeTabWordHighlighter();  // heavy handed for a tab that will not need initialization, ie all other than the one we want
  detectBodyBind();
  const t1 = performance.now();
  timingLog(t0, t1, `DOMContentLoaded for tab ${window.location.href} took`, 8.0);

  // If we are on a WeVote WebApp domain page tab, capture the voter_device_id (this will capture signin when we redirect to WebApp for signin)
  const { hostname } = window.location;
  const webAppHosts = ['wevote.us', 'quality.wevote.us', 'localhost', 'wevotedeveloper.com'];
  if (webAppHosts.includes(hostname)) {
    const voterDeviceId = getCookie ('voter_device_id');
    timingLog(t0, t1, `DOMContentLoaded for tab with voterDeviceId ${voterDeviceId} took`, 8.0);
    if (voterDeviceId && voterDeviceId.length > 10) {
      await mergeToGlobalState({'voterDeviceId': voterDeviceId});
      timingLog(t0, t1, 'DOMContentLoaded mergeToGlobalState voterDeviceId took', 8.0);
    }
  }
});

// function getThisTabId () {
//   const { chrome: { runtime: { sendMessage, lastError } } } = window;
//   console.log('ENTRY to command myTabId ');
//
//   return new Promise ((resolve) => {
//     sendMessage({
//       command: 'myTabId',
//     }, function (response) {
//       if (lastError) {
//         debugFgLog(' chrome.runtime.sendMessage("myTabId")', lastError.message);
//       }
//       console.log('command myTabId response ', response);
//       const {tabId} = response;
//       $('#frame').attr('name', 'tabId=' + tabId);
//       debugFgLog('tabWordHighlighter getThisTabId tab.id: ' + tabId);
//       resolve(tabId);
//     });
//   });
// }

// Immediately-invoked function expression
// const { chrome: { runtime: { tabs } } } = window;  // NO NO NO NMOMN  OWEEEEEEEEEE !!!
// tabs.query({
//   active: true,
//   currentWindow: true
// }, (tabs) => {
//   const tabId = tab[0].id;
//   chrome.scripting.executeScript({
//     target: {
//       tabId: tabId,
//       allFrames: true
//     },
//     files: ['./libs/jquery/jquery-3.6.0.min.js'],
// () => {
//     console.log(`jQuery ${$.fn.jquery} has been loaded successfully!`);
//     // use jQuery below
//     initializeTabWordHighlighter();
//     detectBodyBind();
//   });
// });

// chrome.scripting.executeScript('./libs/jquery/jquery-3.6.0.min.js');
// const script = document.createElement('script');
// script.src = chrome.runtime.getURL('./libs/jquery/jquery-3.6.0.min.js');
// script.type = 'text/javascript';
// script.addEventListener('load', () => {
//     console.log(`jQuery ${$.fn.jquery} has been loaded successfully!`);
//     // use jQuery below
//     initializeTabWordHighlighter();
//     detectBodyBind();
//   // });
//   // document.head.appendChild(script);
// }, 500);
// }());

function isInANonWeVoteIFrame () {
  return (window.self !== window.top  && $('.weVoteEndorsementFrame').length === 0) || window.location.href === 'about:blank';
}

// $(() => {
async function initializeTabWordHighlighter () {
  if (window.location.href === 'about:blank' || window.location.href.includes('extension.html')) {
    debugFgLog('############ tabWordHighligher NOT initializing for:', window.location.href);
    return;
  } else {
    debugFgLog('############ tabWordHighligher initialzed with url: ', window.location.href);
  }

  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  // weContentState.neverHighlightOn = defaultNeverHighlightOn;
  await updateGlobalState({ neverHighlightOn: defaultNeverHighlightOn });

  // const deb = $('div#wedivheader').length > 0;
  // const host = window.location.host;

  if (isInOurIFrame()) {
    sendMessage({
      command: 'myTabId',
    }, async function (response) {
      if (lastError) {
        debugFgLog(' chrome.runtime.sendMessage("myTabId")', lastError.message);
      }

      const { tabId } = response;
      console.log('3/17/23  TEST TEST TEST think this is a tabId: ', tabId);
      $('#frame').attr('name', 'tabId=' + tabId);
      // weContentState.tabId = tab;
      await updateGlobalState({ tabId: tabId });  // TODO: 7/8/22  this looks wrong
      debugFgLog('tabWordHighlighter initializeTabWordHighlighter tab.id: ' + tabId);
    });
    debugFgLog('Hack that sets debugLocal to true in place ------------------------------------');
    debugLocal = true;
  }

  // If not in our iFrame
  if (!isInOurIFrame() && !isInANonWeVoteIFrame()) {
    // Check to see if we are on the WebApp signin page, and capture the device id if signed in
    if (window.location.host.indexOf('wevote.us') > -1 || window.location.host.indexOf('localhost:3000') > -1) {
      const voterDeviceIdFromPage = getVoterDeviceIdFromWeVoteDomainPage();
      if (voterDeviceIdFromPage.length) {
        getVoterDeviceId().then((voterDeviceId) => {
          console.log('initializeTabWordHighlighter voterDeviceId Value was ', voterDeviceId);
          const junk = voterDeviceId + 'x|x';
          console.log('initializeTabWordHighlighter voterDeviceId Value set to ', junk);
        });
      }
    }
    //only listen for messages in the main page, not in iframes
    chrome.runtime.onMessage.addListener(
      // eslint-disable-next-line complexity
      async function (request, sender, sendResponse) {
        const tabWordHighlighterListenerDebug = true;
        tabWordHighlighterListenerDebug && debugFgLog('onMessage.addListener() in tabWordHighlighter got a message: ', request, sender, sendResponse);
        // console.log('Message listener in tabWordHighlighter received: ', request.command);

        if (sender.id === 'pmpmiggdjnjhdlhgpfcafbkghhcjocai' ||
            sender.id === 'lfifjogjdncflocpmhfhhlflgndgkjdo' ||
            sender.id === 'eofojjpbgfdogalmibgljcgdipkhoclc' ||
            sender.id === 'ikoadphkdpbhakeghnjpepfgnodmonpk' ||
            sender.id === 'highlightthis@deboel.eu') {

          const state = await getGlobalState();

          if (request.command === 'displayHighlightsForTabAndPossiblyEditPanes') {
            if (window.location.href.toLowerCase().endsWith('.pdf')) {
              debugFgLog('displayHighlightsForTabAndPossiblyEditPanes skipping PDF file');
              return false;
            }
            const t1 = performance.now();
            // const { priorHighlighterEnabledThisTab } = state;
            const { showHighlights, showEditor, tabId } = request;
            await clearPriorDataOnModeChange(showHighlights, showEditor);
            // Feb 17, 2023., these should have already been set in the popup
            // weContentState.highlighterEnabled = highlighterEnabled;
            // weContentState.highlighterEnabledThisTab = showHighlights;  // Will always be true if showEditor is true
            // weContentState.highlighterEditorEnabled = showEditor;
            // if (tabId > 0) weContentState.tabId = tabId;

            debugFgLog('------------------------------- ENTERING tabWordHighlighter > displayHighlightsForTabAndPossiblyEditPanes');
            debugFgLog('ENTERING tabWordHighlighter > displayHighlightsForTabAndPossiblyEditPanes request.showHighlights: ', showHighlights, ', showEditor: ', showEditor, ', href: ', window.location.href);
            if (!showHighlights) {
              debugFgLog('displayHighlightsForTabAndPossiblyEditPanes (before reload)');
              await updateGlobalState({
                priorData: [],
                priorHighlighterEnabledThisTab: false,
              });
              location.reload();
            }
            const { highlighterEnabledThisTab, highlighterEditorEnabled } = state;
            if (window.location.href !== 'about:blank' && highlighterEnabledThisTab) {  // Avoid worthless queries
              const {href} = window.location;

              if (href !== state.url && href !== state.pdfURL && state.url !== '') {
                // debugSwLog('XXXXWW tabWordHighlighter request ', request);
                // debugSwLog('XXXXWW tabWordHighlighter getGlobalState', state);
                // debugSwLog('XXXXWW tabWordHighlighter window.location.href',  window.location.href);
                console.log('XXXXWW Skipping non-selected tab href: ', href);
                return false;
              }
              console.log('XXXXWW Processing selected tab href: ', href);
              displayHighlightingAndPossiblyEditor(highlighterEnabledThisTab, highlighterEditorEnabled, tabId);
            }
            const t2 = performance.now();
            timingFgLog(t1, t2, 'displayHighlightsForTabAndPossiblyEditPanes processing took', 8.0);
            return false;
          } else if (request.command === 'ScrollHighlight') {
            jumpNext();
            showMarkers();
            return false;
          } else if (request.command === 'hardResetActiveTab') {
            console.log('XXXXXVV hardResetActiveTab tabWordHighlighter location: ', location);
            location.reload();
            return false;
          } else if (request.command === 'getMarkers') {
            sendResponse(highlightMarkers);
            return true;
          } else if (request.command === 'ClearHighlights') {
            highlightMarkers = {};
            return false;
          } else if (request.command === 'ReHighlight') {
            // weContentState.highlighterEnabled = true;
            // weContentState.highlighterEnabledThisTab = true;
            await updateGlobalState({
              highlighterEnabled: true,
              highlighterEnabledThisTab: true,
            });

            reHighlight(request.words);
            return false;
          } else if (request.command === 'createEndorsement') {
            console.log('================================  received createEndorsement');
            await openSuggestionPopUp(request.selection);
            return false;
          } else if (request.command === 'revealRight') {
            revealRightAction(request.selection);
            return false;
          } else if (request.command === 'getTabStatusValues' || request.command === 'getStatusForActiveTab') {
            const encodedHref = encodeURIComponent(location.href);
            const {orgName, organizationWeVoteId, organizationTwitterHandle, tabId, highlighterEnabledThisTab, highlighterEditorEnabled} = state;
            debugFgLog('getTabStatusValues tabId: ', tabId, ', highlighterEnabledThisTab: ', highlighterEnabledThisTab, ', highlighterEditorEnabled: ', highlighterEditorEnabled, ', href: ', window.location.href);
            sendResponse({
              highlighterEnabledThisTab,
              highlighterEditorEnabled,
              orgName,
              organizationWeVoteId,
              organizationTwitterHandle,
              encodedHref
            });
            return false;
          } else if (request.command === 'disableExtension') {
            // enableHighlightsForAllTabs(false);
            return false;
          } else if (request.command === 'logFromPopup') {
            console.log('popup: ' + request.payload);
            sendResponse('hello from the tabWordHighlighter');
            return true;
          } else if (request.command === 'updateForegroundForButtonChange') {
            debugSwLog('extWordHighlighter "updateForegroundForButtonChange" received from popup');
            const { showHighlights, openEditPanel, pdfURL, tabId, tabUrl } = request.payload;
            console.log('updateForegroundForButtonChange: ', request.payload);

            // March 30, 2023, we know the tabId and tabURL for sure here, so save them.  In the case of PDF, these will change later.
            console.log('updateForegroundForButtonChange March 30thh, saving tabId and tabURL to global state');
            await updateGlobalState({ tabId: tabId, url: tabUrl });

            sendMessage({
              command: 'updateBackgroundForButtonChange',
              showHighlights,
              openEditPanel,
              pdfURL,
              tabId,
              tabUrl
            // }, function (response) {  // Don't send/look for unneeded responses, avoids 'Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.' errors
            //   console.log('chrome.runtime.sendMessage("updateBackgroundForButtonChange") response: ', response);
            //   // console.log('chrome.runtime.sendMessage("updateBackgroundForButtonChange") lstError', lastError);
            //   // if (!response.success) {
            //   //   debugFgLog('chrome.runtime.sendMessage("updateBackgroundForButtonChange")', lastError.message);
            //   // }
            });
            return false;  // Does not return a response, so return false
          } else {
            console.error('tabWordHighlighter in chrome.runtime.onMessage.addListener received unknown command: ' + request.command);
            return false;
          }
        }
      }
    );
  } else {
    debugFgLog('not in a unframed endorsement page: ', window.location);
  }

  if (window.location.href !== 'about:blank') {  // Avoid worthless queries
    await sendGetStatus();  // Initial get statos
  }
}

function jumpNext () {
  if (markerCurrentPosition === markerPositions.length - 1 || markerCurrentPosition > markerPositions.length - 1) {
    markerCurrentPosition = -1;
  }
  markerCurrentPosition += 1;
  $(window).scrollTop(markerPositions[markerCurrentPosition] - (window.innerHeight / 2));
  //document.body.scrollTop=markerPositions[markerCurrentPosition]-(window.innerHeight/2);
}

function showMarkers () {
  debugFgLog('background showMarkers');
  let element = document.getElementById('HighlightThisMarkers');
  if (element) {
    element.parentNode.removeChild(element);
  }

  let containerElement = document.createElement('DIV');
  containerElement.id = 'HighlightThisMarkers';

  for (let marker in highlightMarkers) {
    let span = document.createElement('SPAN');
    span.className = 'highlightThisMarker';
    span.style.backgroundColor = highlightMarkers[marker].color;
    let markerposition = document.body.scrollTop + (highlightMarkers[marker].offset / document.body.clientHeight) * window.innerHeight;
    span.style.top = markerposition + 'px';
    containerElement.appendChild(span);
  }
  document.body.appendChild(containerElement);
  if (!markerScroll) {
    document.addEventListener('scroll', function () {
      showMarkers();
    });
    markerScroll = true;
  }
}

function reHighlight (words) {
  const reHighlightDebug = true;
  reHighlightDebug && debugFgLog('ENTERING function reHighlight(words), words:', words);
  for (let group in words) {
    if (words[group].Enabled) {
      for (let word in words[group].Words) {
        // reHighlightDebug && debugFgLog('reHighlight word = ' + word);
        if (words[group].Words[word]) {
          wordsArray.push({
            word: words[group].Words[word].toLowerCase(),
            'regex': globStringToRegex(words[group].Words[word]),
            'Color': words[group].Color,
            'Fcolor': words[group].Fcolor,
            'Icon': words[group].Icon,
            'FindWords': words[group].FindWords,
            'ShowInEditableFields': words[group].ShowInEditableFields
          });
        } else {
          reHighlightDebug && debugFgLog('Null word in rehighlight');
        }
      }
    }
  }
  reHighlightDebug && debugFgLog('reHighlight before findWords --------------------------- namesToIds: ', namesToIds);

  findWords();
}

async function getVoterDeviceIdFromWeVoteDomainPage () {
  // Capture the voter_device_id if we are on a wevote page
  const tag = 'voter_device_id';
  try {
    let b = document.cookie.match('(^|[^;]+)\\s*' + tag + '\\s*=\\s*([^;]+)');
    let id = b ? b.pop() : '';
    if (id && id.length > 5) {
      debugFgLog('=======  voter_device_id captured from a wevote page, id: ' + id);
      await mergeToGlobalState({ 'voterDeviceId': id });
      debugFgLog('======= voterDeviceId was merged mergeToGlobalState from a wevote page, id: ' + id);
    } else {
      debugFgLog('======= voterDeviceId WAS NOT MERGED mergeToGlobalState from a wevote page since no id');
    }
    return id;
  } catch (e) {
    debugFgLog('======= voterDeviceId cookie does not exist so no id');
    return '';
  }
}

// When a tab sends the getStatus message, it starts a whole sequence of events and other messages, that go to the API server
// and retrieves the appropriate candidate names, brings them back to the extension, and then starts highlighting the candidate names
// on the endorsement page that is displayed in the tab (for example, https://www.sierraclub.org/california/2020-endorsements/).
async function sendGetStatus () {
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  const state = await getGlobalState();
  const { neverHighlightOn } = state;

  for (let i = 0; i < neverHighlightOn.length; i++) {
    let reg = new RegExp(neverHighlightOn[i].replace('*', '.*?'));
    if (window.location.hostname.match(reg)) {
      debugFgLog('sendGetStatus found a neverHighlightOn match: ', window.location.hostname);
      return;
    }
  }

  sendMessage({command: 'getStatus', tabURL: window.location.href}, async function (response) {
    debugFgLog('chrome.runtime.sendMessage({command: \'getStatus\'}', document.URL);
    if (lastError) {
      debugFgLog('chrome.runtime.sendMessage("getStatus")', lastError.message);
      return;
    }
    debugFgLog('response from getStatus', response);
    if (!response) {
      debugFgLog('ERROR: sendMessage for getStatus returned no status');
      return;
    }
    const { showHighlights, showEditor, tabId, url } = response;

    // if (!existenceOfTab) {
    //   debugFgLog('"getStatus called for a url that is not a tabUrl, probably for an iframe within a tab: ', url);
    //   return;
    // }

    // bs detector, work around a likely chrome.tabs bug - May, 2020
    if (url && !url.includes(window.location.host)) {
      debugFgLog('sendMessage for getStatus aborted on page ', window.location.host, ' returned url: ', url, ', with probably wrong tab id: ', tabId);
      return;
    }

    await clearPriorDataOnModeChange(showHighlights, showEditor);
    // Feb 27, 2023 now set in popup
    // weContentState.highlighterEnabled = highlighterEnabled;
    // weContentState.highlighterEnabledThisTab  = showHighlights;
    // weContentState.highlighterEditorEnabled = showEditor;
    // if (tabId > 0) weContentState.tabId = tabId;
    // weContentState.neverHighlightOn = neverHighlightOn && neverHighlightOn.length ? neverHighlightOn : weContentState.neverHighlightOn;
    // tabId = responseTabId;  Since this works in our iFrame,  a lot of the other startup is unnecessary --  April 26, 2020, do we even need 'myTabId' msg chain?
    const state = await getGlobalState();
    const { url: urlFromState, tabId: tabIdFromState } = state;

    // console.log('STORAGE ***************************** state ', state);
    if (tabId === -1) {
      await updateGlobalState({ tabId: tabId, url: url });
    }
    const highlightThisTab = tabId === tabIdFromState;
    debugFgLog('sendGetStatus -- Testing for correct tab -- correct: ', highlightThisTab, ', this tabID: ', tabId, ', tabIdFromState:', tabIdFromState, window.location.href, urlFromState);
    if (highlightThisTab) {
      await getWordsThenStartHighlighting();
    }
  });
}

// async function refreshVoterGuidePanel () {  // Based on updatePositionPanelFromTheIFrame
//   const {chrome: {runtime: {sendMessage, lastError}}} = window;
//   const state = await getGlobalState();
//   const { neverHighlightOn, highlighterEnabledThisTab } = state;
//
//   for (let i = 0; i < neverHighlightOn.length; i++) {
//     let reg = new RegExp(neverHighlightOn[i].replace('*', '.*?'));
//     if (window.location.hostname.match(reg)) {
//       debugFgLog('refreshVoterGuidePanel found a neverHighlightOn match: ', window.location.hostname);
//       return;
//     }
//   }
//
//   const showHighlights = true;
//   const showEditor = true;
//   clearPriorDataOnModeChange(showHighlights, showEditor);
//   // Feb 17, 2023., these should have already been set in the popup
//   // weContentState.highlighterEnabled = highlighterEnabled;
//   // weContentState.highlighterEnabledThisTab  = showHighlights;
//   // weContentState.highlighterEditorEnabled = showEditor;
//   // if (tabId > 0) weContentState.tabId = tabId;
//   // weContentState.neverHighlightOn = neverHighlightOn && neverHighlightOn.length ? neverHighlightOn : weContentState.neverHighlightOn;
//   // weContentState.neverHighlightOn = false;
//
//   // tabId = responseTabId;  Since this works in our iFrame,  a lot of the other startup is unnecessary TODO: April 26, 2020, do we even need 'myTabId' msg chain?
//   if (highlighterEnabledThisTab) {
//     debugFgLog('about to get words', window.location);
//     await getWordsThenStartHighlighting();
//   }
//   // });
// }

async function clearPriorDataOnModeChange (showHighlights, showEditor) {
  const state = await getGlobalState();
  const { highlighterEnabledThisTab, highlighterEditorEnabled } = state;

  if ((!showHighlights && !showEditor) ||
    (highlighterEnabledThisTab && highlighterEditorEnabled !== showEditor)) {
    await updateGlobalState({ priorData: [] });
    // weContentState.priorData = [];  // Needed to avoid the 'unchanged data ... abort' when swapping display editor/highlights only
  }
}

function closeIFrameDialog () {
  console.log('------------------------------------ closeIFrameDialog 528 entry');
  const dialogClosed = true;
  if (isInOurIFrame()) { // if in an iframe
    debugFgLog('With editors displayed, and the endorsement page in an iFrame, the modal containing an iFrame to the webapp has closed.  Evaluating the need to update the PositionsPanel,state ');
    console.log('------------------------------------ closeIFrameDialog 531');
    retryLoadPositionPanel();         // Refresh the Position Panel with the potentially updated data (very fast)
  } else {
    debugFgLog('dialog containing iFrame has closed, either without the editor displayed, or for newly discovered positions, ie right click on highlighed position');
    console.log('------------------------------------ closeIFrameDialog 546 no iframe');
    updateHighlightsIfNeeded(dialogClosed);
  }
  $('#weVoteModal').remove();
}

function createWediv () {
  debugFgLog('---------------------------------------- inserting wediv for the dialog into the top of the body');
  const head = document.head || document.getElementsByTagName('head')[0];

  const style = document.createElement('style');
  head.append(style);
  // style.type = 'text/css';
  // Note that the source code for this css is in popupIFrame.html, where it can be tested in a browser, then minified with https://cssminifier.com/
  const css = '#wediv{position:absolute;z-index:10000;background-color:#000;text-align:center;border:1px solid #d3d3d3;box-shadow:10px 10px 5px 0 rgba(0,0,0,.4);height:640px;}#wedivheader{cursor:move;z-index:10;background-color:#2e3c5d;color:#fff;height:30px}#weIFrame{width:450px;height:568px;border-width:0;border:none}#wetitle{float:left;margin-left:8px;margin-top:2px}.weclose{height:10px;width:10px;float:right;margin-right:16px;background-color:#2e3c5d;color:#fff;border:none;font-weight:bolder;font-stretch:extra-expanded;font-size:12pt}.highlight{padding:1px;box-shadow:#e5e5e5 1px 1px;border-radius:3px;-webkit-print-color-adjust:exact;background-color:#ff6;color:#000;font-style:inherit}';
  style.appendChild(document.createTextNode(css));

  const markup = document.createElement('div');
  markup.id = 'wediv';
  markup.hidden = true;
  markup.innerHTML =
    '<div id="wedivheader">\n' +
    '  <span id="wetitle"></span>\n' +
    '  <span id="closeButton">\n' +
    '    <button type="button" class="weclose" onclick="const l = document.getElementById(\'wediv\'); l.hidden = true;">X</button>\n' +
    '  </span>\n' +
    '</div>\n' +
    '<iframe id="weIFrame" src="' + extensionWarmUpPage + '" name="tabId="></iframe>\n';
  $('body').first().prepend(markup);
  if (isInOurIFrame()) {
    preloadPositionsForAnotherVM();  // preLoad positions for this VM, if it is a VM within an iFrame
  }

  // let dialog = $('[role=dialog]');
  // console.log('------------------------------ role=dialog at 0 seconds');
  // const timer = setTimeout(() => {
  //   let dialog = $('[role=dialog]');
  //   console.log('------------------------------ role=dialog at 5 seconds, 5/11/23 TODO: Put pane refresh logic here');
  // }, 5000);

  $('.weclose').click(() => {
    console.log('-------------------------------------- closeIFrameDialog() called -----------');
    closeIFrameDialog();
  });
  window.addEventListener('message', function (e) {
    debugFgLog('tabWordHighlighter receiving close message from iFrame: ', e.data);
    console.log('tabWordHighlighter receiving close message from iFrame: ', e.data);
    if (e.data === 'closeIFrameDialog') {
      debugFgLog('closing iFrame dialog');
      closeIFrameDialog();
    }
  }, false);
}

async function getWordsThenStartHighlighting () {
  const getWordsThenStartHighlightingDebug = false;
  const t1 = performance.now();
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  debugFgLog('ENTERING tabWordHighlighter > getWordsThenStartHighlighting,  Called \'getWords\'');
  const state = await getGlobalState();
  const { tabId } = state;

  sendMessage({
    command: 'getWords',
    url: location.href.replace(location.protocol + '//', ''),
    voterDeviceId: getVoterDeviceIdFromWeVoteDomainPage(),  // is this nonsense?
    tabId: tabId,
  }, function (response) {
    if (!response) {
      debugFgLog('chrome runtime sendMessage("getWords") did not receive a response');
      return;
    }

    const { url, storedDeviceId, words } = response;
    getWordsThenStartHighlightingDebug && debugFgLog('Received response getWordsThenStartHighlighting() URL: ', url);

    if (lastError) {
      debugFgLog('chrome runtime sendMessage("getWords")',lastError.message);
      return;
    }
    getWordsThenStartHighlightingDebug && debugFgLog('got words response: ', response);
    const id = storedDeviceId ? storedDeviceId : '';
    if (storedDeviceId && storedDeviceId.length > 0) {
      voterDeviceId = id;
    }

    for (let group in words) {
      if (words[group].Enabled) {
        for (let word in words[group].Words) {
          getWordsThenStartHighlightingDebug && debugFgLog('getWords response, ' + word + ', group: ' + group + ', findWords: ' + words[group].FindWords + ' icon: ' + words[group].Icon);
          let wordText = words[group].Words[word];
          if (wordText) {  // Sept 15, 2019:  Sometimes we get bad data, just skip it
            wordsArray.push({
              word: words[group].Words[word].toLowerCase(),
              'regex': globStringToRegex(words[group].Words[word]),
              'Color': words[group].Color,
              'Fcolor': words[group].Fcolor,
              'Icon': words[group].Icon,
              'FindWords': words[group].FindWords,
              'ShowInEditableFields': words[group].ShowInEditableFields
            });
          }
        }
      }
    }
    const t2 = performance.now();
    timingFgLog(t1, t2, 'in getWordsThenStartHighlighting, retrieving "getWords" highlighting rules took', 8.0);

    if (words.nameToIdMap) {
      namesToIds = words.nameToIdMap;  // This is the one that delivers, when in an iFrame.  It probably is all we need if not in a frame.
    }

    debugFgLog('processed words');
    wordsReceived = true;

    //start the highlight loop
    highlightLoop();

    if (!document.getElementById('wediv')) {
      createWediv();
    }
  });
}

function detectBodyBind () {
  $(document).ready(function () {
    Highlight = true;

    debugFgLog('setup binding of dom sub tree modification');
    $('body').bind('DOMSubtreeModified', function () {
      //debugFgLog("dom sub tree modified");
      Highlight = true;
    });
  });
}


function highlightLoop (){

  ReadyToFindWords = true;

  // let i = 0;
  HighlightLoop = setInterval(function () {
    // if (i % 10 === 0) {
    //   console.log('-------- calling findWords in highlightLoop -----------');  // uses a lot of CPU, but useful sometimes
    // }
    const modalDisplayed = isModalDisplayed();
    !modalDisplayed && Highlight && ReadyToFindWords && findWords();
    if(!ReadyToFindWords) {
      sleep(500);
    }
  }, HighlightLoopFrequency);

}

// function getSearchKeyword () {
//   let searchKeyword = null;
//   if (document.referrer) {
//     for (searchEngine in searchEngines) {
//       if (document.referrer.indexOf(searchEngine)) {
//         searchKeyword = getSearchParameter(searchEngines[searchEngine]);
//       }
//     }
//   }
//   return searchKeyword;
// }

// function getSearchParameter (n) {
//   const half = document.referrer.split(n + '=')[1];
//   return half !== undefined ? decodeURIComponent(half.split('&')[0]) : null;
// }

/*function start() {
    debugFgLog("in start");
    if (wordsReceived == true) {
        debugFgLog("in start - words received");
        Highlight=true
        $("body").bind("DOMSubtreeModified", function () {
            debugFgLog("dom sub tree modified", readyToFindWords);
            Highlight=true;
        });
    }
    else {
        setTimeout(function () {
            debugFgLog('waiting for words');
            start();
        }, 250);
    }
}*/

// <td>
//   <em class="Highlight" style="padding: 1px; box-shadow: rgb(229, 229, 229) 1px 1px; border-radius: 3px; " +
//             "-webkit-print-color-adjust: exact; background-color: rgb(124, 123, 124); " +
//             "color: rgb(255, 255, 255); font-style: inherit;">Kate Gallego</em>
// </td>
// function removeAllHighlights () {
//   // For some reason when we get here, the dom for the iframe is inaccessible, even though it should be in the same
//   // domain.
//   // 9/26/19:  Will go with a iframe reload for now
//
//   // let bod = $('body');
//   // let ems = $(bod).children().find('em.Highlight');
//   let arr = document.getElementsByTagName('EM');
//   let fd = document.getElementById('frameDiv');
//   let f0 = $('iframe')[0];
//   let f0b = $(f0).find(':button');
//   let f0e = $(f0).find('em');
//
//   let b2 = $('body').find('em');
//   let b3 = $('body').find('em.Highlight');
//   let b4 = $('body em');
//   let b5 = $('body em.Highlight');
//   let buttons = $('body').find(':button');
//   debugFgLog($('#weContainer').html());
//
//   $('em.Highlight').each((em) => {
//     let text = $(em).text();
//     debugFgLog('removeAll: ' + i + ', ' + text);
//     $(em).replace(text);
//   });
//   // ems.replaceWith(ems.innerText);
// }


function findWords () {
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  if (Object.keys(wordsArray).length > 0) {
    Highlight=false;

    setTimeout(function () {
      debugFgLog('ENTERING findWords: ', window.location);

      ReadyToFindWords=false;

      const t1 = performance.now();
      let myHilitor = new Hilitor();
      let highlights = myHilitor.apply(wordsArray, printHighlights);
      const t2 = performance.now();
      timingFgLog(t1, t2, 'in findWords, Hilitor (apply) took', 8.0);

      // debugFgLog('after myHilitor.apply num highlights: ' + highlights.numberOfHighlights);
      if (highlights.numberOfHighlights > 0) {
        highlightMarkers = highlights.markers;
        markerPositions = [];
        for (let marker in highlightMarkers) {
          if (markerPositions.indexOf(highlightMarkers[marker].offset) === -1) {
            markerPositions.push(highlightMarkers[marker].offset);
          }
        }
        markerPositions.sort();

        let len = Object.keys(highlightMarkers).length;
        for (let i = 0; i < len; i++) {
          let {word} = highlightMarkers[i];
          if (!uniqueNameMatches.includes(word)) {
            uniqueNameMatches.push(word);
          }
        }

        try {
          console.log('showHighlightsCount in tabWordHighlighter, count = ' + uniqueNameMatches.length.toString()); // always log this
          sendMessage({
            command: 'showHighlightsCount',
            label: uniqueNameMatches.length.toString(),
            uniqueNames: uniqueNameMatches,
            altColor: uniqueNameMatches.length ? '' : 'darkgreen',
          }, function () {
            if (lastError) {
              debugFgLog('findWords() ... chrome.runtime.sendMessage("showHighlightsCount")', lastError.message);
            }
          });
        } catch (e) {
          debugFgLog('Caught showHighlightsCount > 0: ', e);
        }
      } else {
        try {
          sendMessage({
            command: 'showHighlightsCount',
            label: '0',
            uniqueNames: [],
            altColor: 'darkgreen',
          }, function () {
            if (lastError) {
              debugFgLog(' chrome.runtime.sendMessage("showHighlightsCount")', lastError.message);
            }
          });
        } catch (e) {
          debugFgLog('Caught showHighlightsCount === 0 ', e);
        }

      }
      //setTimeout(function () {
      ReadyToFindWords = true;
      //}, HighligthCooldown);
    }, HighlightWarmup);
  }

  convertV2onClickToV3();

  // This following log line floods the log, and slows things down -- use sparingly while debugging
  // debug && debugFgLog('finished finding words');
}

let convertedOnClicks = ['JoeShmoe'];

function addHighlightOnClick (id, url, element) {
  convertedOnClicks.push(id);
  element.click(() => {
    console.log('Detected onClick for ' + id + ', at url ' + url);
    setModal(true, url, id);
  });
}

function convertV2onClickToV3 () {  // 4/5/23: Removed the ".each" replacement of setModal that had been pre-written into every wrapped highlight markup, and replace it with a onClick made on the fly.
  $('.weclose').each(function () {
    // <button type="button" className="weclose" onClick="setModal(false,'' ,'')">X</button>
    // eslint-disable-next-line no-invalid-this
    const el = $(this);
    if (el.attr('onClick') !== undefined) {
      let id = el.attr('id');
      let onClickText = el.attr('onClick');
      if (onClickText.length > 0) {
        while(convertedOnClicks.includes(id)) {
          id += 'x';
        }
        convertedOnClicks.push(id);
        el.click(() => {
          console.log('converted onClick for (weclose) ' + id);
          setModal(false, '', '');
        });
      }
    }
  });
}

function revealRightAction (selection) {
  const nameMatchElement = $('#sideArea').contents().find(':contains(' + selection + '):last');
  if (nameMatchElement.length) {
    $(nameMatchElement)[0].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      // inline: 'center'
    });
  }
}

// This allows the popup to find out if this tab is highlighted and/or editors are displayed
async function getDisplayedTabStatus (tabId) {
  const state = await getGlobalState();
  const { highlighterEditorEnabled, highlighterEnabledThisTab, editorEnabledThisTab } = state;
  // const { highlighterEnabledThisTab, highlighterEditorEnabled} = weContentState;
  debugFgLog('getDisplayedTabStatus tabId: ' + tabId + ', highlighterEnabledThisTab: ' + highlighterEnabledThisTab + ', highlighterEditorEnabled: ' + highlighterEditorEnabled);
  return {
    highlighterEnabledThisTab,
    editorEnabledThisTab,
  };
}

function globStringToRegex (str) {
  return preg_quote(str).replace(/\\\*/g, '\\S*').replace(/\\\?/g, '.');
}

// eslint-disable-next-line camelcase
function preg_quote (str,delimiter) {
  // http://kevin.vanzonneveld.net
  // +   original by: booeyOH
  // +   improved by: Ates Goral (http://magnetiq.com)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: preg_quote("$40");
  // *     returns 1: '\$40'
  // *     example 2: preg_quote("*RRRING* Hello?");
  // *     returns 2: '\*RRRING\* Hello\?'
  // *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
  // *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'
  return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}
