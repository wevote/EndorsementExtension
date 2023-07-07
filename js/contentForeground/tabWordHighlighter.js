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
let wordsReceived = false;
// let searchEngines = {
//   'google.com': 'q',
//   'bing.com': 'q'
// };
let markerCurrentPosition = -1;
let markerPositions = [];
let highlightMarkers = {};
let markerScroll = false;
let printHighlights = true;
let uniqueNameMatches = [];
let voterDeviceId = '';
let debug = false;

document.addEventListener('DOMContentLoaded', async function () {  // This wastes about 1 ms for every open tab in the browser, that we are not going to highlight on
  const t0 = performance.now();
  const { runtime: { getURL } } = chrome;
  if (jQuery === undefined) {
    const script = document.createElement('script');
    script.src = getURL('./libs/jquery/jquery-3.6.0.min.js');
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

function isInANonWeVoteIFrame () {
  return (window.self !== window.top  && $('.weVoteEndorsementFrame').length === 0) || window.location.href === 'about:blank';
}

async function initializeTabWordHighlighter () {
  if (window.location.href === 'about:blank' || window.location.href.includes('extension.html')) {
    debugFgLog('############ tabWordHighligher NOT initializing for:', window.location.href);
    return;
  } else {
    debugFgLog('############ tabWordHighligher initialzed with url: ', window.location.href);
  }

  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  await updateGlobalState({ neverHighlightOn: defaultNeverHighlightOn });

  // const deb = $('div#wedivheader').length > 0;
  // const host = window.location.host;

  if (isInOurIFrame()) {
    debugFgLog('^^^^^^^^^^^^^^^^^^^ sendMessage myTabId in initializeTabWordHighlighter');
    sendMessage({
      command: 'myTabId',
    }, async function (response) {
      if (lastError) {
        debugFgLog(' chrome.runtime.sendMessage("myTabId")', lastError.message);
      }

      const { tabId } = response;
      console.log('3/17/23  TEST TEST TEST think this is a tabId: ', tabId);
      $('#frame').attr('name', 'tabId=' + tabId);
      await updateGlobalState({ tabId: tabId });  // TODO: 7/8/22  this looks wrong
      debugFgLog('tabWordHighlighter initializeTabWordHighlighter tab.id: ' + tabId);
    });
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
    const { runtime: { onMessage } } = chrome;
    onMessage.addListener(
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
          const { showHighlights, showPanels, tabId, url, pdfURL } = state;
          debugFgLog('@@@@@@@@@@@ Message listener in tabWordHighlighter received: ', request.command, request.selection);

          if (request.command === 'displayHighlightsForTabAndPossiblyEditPanes') {
            if (window.location.href.toLowerCase().endsWith('.pdf')) {
              debugFgLog('displayHighlightsForTabAndPossiblyEditPanes skipping PDF file');
              return false;
            }
            const t1 = performance.now();
            // const { priorHighlighterEnabledThisTab } = state;
            // const { showHighlights, showPanels, tabId } = request;
            await clearPriorDataOnModeChange(showHighlights, showPanels);

            debugFgLog('------------------------------- ENTERING tabWordHighlighter > displayHighlightsForTabAndPossiblyEditPanes');
            debugFgLog('ENTERING tabWordHighlighter > displayHighlightsForTabAndPossiblyEditPanes showHighlights: ', showHighlights, ', showPanels: ', showPanels, ', href: ', window.location.href);
            if (!showHighlights) {
              debugFgLog('displayHighlightsForTabAndPossiblyEditPanes (before reload)');
              await updateGlobalState({
                priorData: [],
                priorHighlighterEnabledThisTab: false,
              });
              location.reload();
            }
            if (window.location.href !== 'about:blank' && showHighlights) {  // Avoid worthless queries
              const {href} = window.location;

              if (href !== url && href !== pdfURL && url !== '') {
                console.log('Skipping non-selected tab href: ', href);
                return false;
              }
              console.log('Processing selected tab href: ', href);
              displayHighlightingAndPossiblyEditor(showHighlights, showPanels, tabId);
            }
            const t2 = performance.now();
            timingFgLog(t1, t2, 'displayHighlightsForTabAndPossiblyEditPanes processing took', 8.0);
            return false;
          } else if (request.command === 'ScrollHighlight') {
            jumpNext();
            showMarkers();
            return false;
          } else if (request.command === 'hardResetActiveTab') {
            console.log('hardResetActiveTab tabWordHighlighter location: ', location);
            location.reload();
            return false;
          } else if (request.command === 'getMarkers') {
            sendResponse(highlightMarkers);
            return true;
          } else if (request.command === 'ClearHighlights') {
            highlightMarkers = {};
            return false;
          } else if (request.command === 'ReHighlight') {
            reHighlight(request.words);
            return false;
          } else if (request.command === 'createEndorsement') {
            console.log('================================  received createEndorsement request.selection: ', request.selection);
            if (request.selection === undefined) {
              console.log('================================  received createEndorsement with UNDEFINED request.selection');
            } else {
              await openSuggestionPopUp(request.selection);
            }
            return false;
          } else if (request.command === 'revealRight') {
            revealRightAction(request.selection);
            return false;
          } else if (request.command === 'getStatusForActiveTab') {
            const encodedHref = encodeURIComponent(location.href);
            const {orgName, organizationWeVoteId, organizationTwitterHandle} = state;
            debugFgLog('getStatusForActiveTab tabId: ', tabId, ', href: ', window.location.href);

            sendResponse({
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
            return false;
          } else if (request.command === 'updateForegroundForButtonChange') {
            debugSwLog('extWordHighlighter "updateForegroundForButtonChange" received from popup');
            const { pdfURL, tabId, tabUrl } = request.payload;
            console.log('updateForegroundForButtonChange: ', request.payload);
            // March 30, 2023, we know the tabId and tabURL for sure here, so save them.  In the case of PDF, these will change later.
            console.log('updateForegroundForButtonChange, saving tabId and tabURL to global state');
            await updateGlobalState({ tabId: tabId, url: tabUrl });

            debugFgLog('^^^^^^^^^^^^^^^^^^^ sendMessage updateBackgroundForButtonChange in isInANonWeVoteIFrame');
            sendMessage({
              command: 'updateBackgroundForButtonChange',
              showHighlights,
              showPanels,
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
    await sendGetStatus();  // Initial get status
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

function addWordsToWordsArray (words) {
  for (let group in words) {
    if (words[group].Enabled) {
      for (let word in words[group].Words) {
        // reHighlightDebug && debugFgLog('addWordsToWordsArray word = ' + word);
        if (words[group].Words[word]) {
          const reg = globStringToRegex(words[group].Words[word]);
          const newWordsElement = {
            word: words[group].Words[word].toLowerCase(),
            'regex': reg,
            'Color': words[group].Color,
            'Fcolor': words[group].Fcolor,
            'Icon': words[group].Icon,
            'FindWords': words[group].FindWords,
            'ShowInEditableFields': words[group].ShowInEditableFields
          };
          const oldWordElement = wordsArray.find((arrayItem) => arrayItem.regex === reg);
          if (oldWordElement) {
            const exactDupe = JSON.stringify(oldWordElement) === JSON.stringify(newWordsElement);
            if (exactDupe) {
              // debugFgLog('^^^^^^^^^^^^^^^^^^^^^ addWordsToWordsArray() SKIPPING duplicate element: ', oldWordElement, newWordsElement);
            } else {
              // debugFgLog('^^^^^^^^^^^^^^^^^^^^^ addWordsToWordsArray() REPLACING OLDER element: ', oldWordElement, newWordsElement);
              Object.assign(oldWordElement, newWordsElement);
            }
          } else {
            wordsArray.push(newWordsElement);
          }
        } else {
          debugFgLog('Null word in rehighlight');
        }
      }
    }
  }
}

function reHighlight (words) {
  const reHighlightDebug = true;
  reHighlightDebug && debugFgLog('ENTERING function reHighlight(words), words:', words);
  addWordsToWordsArray(words);
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
      // debugFgLog('======= voterDeviceId WAS NOT MERGED mergeToGlobalState from a wevote page since no id');
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

  debugFgLog('^^^^^^^^^^^^^^^^^^^ sendMessage getStatus in sendGetStatus');
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
//   // tabId = responseTabId;  Since this works in our iFrame,  a lot of the other startup is unnecessary : April 26, 2020, do we even need 'myTabId' msg chain?
//   if (highlighterEnabledThisTab) {
//     debugFgLog('about to get words', window.location);
//     await getWordsThenStartHighlighting();
//   }
//   // });
// }

async function clearPriorDataOnModeChange (showHighlights, showPanels) {
  if (!showHighlights && !showPanels) {
    await updateGlobalState({ priorData: [] });
  }
}

let debounceCloseMessage = false;
function debounceCloseIFrameDialog () {
  if (debounceCloseMessage === false) {
    debounceCloseMessage = true;
    setTimeout(function (){
      debugFgLog('Debounce of closeIFrameDialog message has ended');
      debounceCloseMessage = false;
    }, 1000);
    return false;
  }
  return debounceCloseMessage;
}

async function closeIFrameDialog () {
  if (debounceCloseIFrameDialog()) {
    return;
  }
  const dialogClosed = true;

  $('#weVoteModal').remove();
  if (isInOurIFrame()) { // if in an iframe
    debugFgLog('With editors displayed, and the endorsement page in an iFrame, the modal containing an iFrame to the webapp has closed.  Evaluating the need to update the PositionsPanel,state ');
    await getWordsThenStartHighlighting();  // Force an update to HighlightsData
    retryLoadPositionPanel();         // Refresh the Position Panel with the potentially updated data (very fast)
  } else {
    debugFgLog('dialog containing iFrame has closed, either without the editor displayed, or for newly discovered positions, ie right click on highlighed position');
    updateHighlightsIfNeeded(dialogClosed);   // this updates only the right panel?????????
  }
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
  //   console.log('------------------------------ role=dialog at 5 seconds, 5/11/23 Put pane refresh logic here');
  // }, 5000);

  $('.weclose').click(() => {
    console.log('-------------------------------------- closeIFrameDialog() called ----------- ');
    closeIFrameDialog();
  });
  window.addEventListener('message', function (e) {
    e.stopPropagation();
    if (e.data === 'closeIFrameDialog') {
      console.log('------ close ------ close ------ close ------ close ------ close ------ close ------ close ------ close ------ close ------');
      debugFgLog('tabWordHighlighter (create new) receiving close message from iFrame: ', e.data);
      debugFgLog('closing iFrame dialog after creating a new endorsement');
      closeIFrameDialog();
    }
  }, false);
}

async function getWordsThenStartHighlighting () {
  const getWordsThenStartHighlightingDebug = false;
  const t1 = performance.now();
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  debugFgLog('ENTERING tabWordHighlighter > getWordsThenStartHighlighting,  About to call "getWords"');
  const state = await getGlobalState();
  const { tabId } = state;

  debugFgLog('In getWordsThenStartHighlighting');

  debugFgLog('^^^^^^^^^^^^^^^^^^^ sendMessage getWords #1 in getWordsThenStartHighlighting');
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

    // console.log('------------------------------------ Received response getWordsThenStartHighlighting()', JSON.parse(JSON.stringify(response)));

    const { url, storedDeviceId, words } = response;
    getWordsThenStartHighlightingDebug && debugFgLog('Received response getWordsThenStartHighlighting() URL: ', url);

    if (lastError) {
      debugFgLog('chrome runtime sendMessage("getWords")', lastError.message);
      return;
    }
    getWordsThenStartHighlightingDebug && debugFgLog('got words response: ', response);
    const id = storedDeviceId ? storedDeviceId : '';
    if (storedDeviceId && storedDeviceId.length > 0) {
      voterDeviceId = id;
    }

    addWordsToWordsArray(words);
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

  debugFgLog('In getWordsThenStartHighlighting AFTER IN CODE setTimer for 10 SECOND DELAY HACK');  // 6/27/23 ??? does this still make sense
}

function detectBodyBind () {
  $(document).ready(function () {
    Highlight = true;

    // June 15, 2023: was receiving jquery-3.6.0.min.js:2 [Violation] Added synchronous DOM mutation listener to a 'DOMSubtreeModified' event. Consider using MutationObserver to make the page more responsive.
    // And it is unclear if this had any value, so removed it (and the app did seem more responsive):
    // debugFgLog('setup binding of dom sub tree modification');  // June 2023, detect that the dom was modified.  Not sure why we need this?
    // $('body').bind('DOMSubtreeModified', function () {
    //   //debugFgLog("dom sub tree modified");
    //   Highlight = true;
    // });
  });
}


async function highlightLoop (){
  ReadyToFindWords = true;
  let i = 0;

  const state = await getGlobalState();
  const { highlighterLooping } = state;

  // TODO 6/27/23 this is triggering twice after and edit, so the highlighterLooping variable state is not being managed, wasteful and confusing
  if (highlighterLooping) {
    // Do secondary findWords, so after the quick draw of endorsements for this page (greens)
    // we do the slower find all candidates (yellows).  This avoids having two highlightLoops running simultaneously
    // for the life of the page, which then wastefully processes the same page twice for each update.
    console.log('-------- calling findWords outside of the highlightLoop ----------- ');
    await findWords();
  } else {
    await updateGlobalState({highlighterLooping: true});
    let highlightLoopIntervalId = setInterval(async function () {
      try {
        const state = await getGlobalState();
        const {
          showHighlights,
          showPanels,
        } = state;
        // if (++i % 10 === 0) {
        //   console.log('-------- calling findWords (if needed) in highlightLoop ----------- ', i, suppressHighlightLoop, showHighlights, showPanels, Highlight, highlightLoopIntervalId);  // uses a lot of CPU, but useful sometimes
        // }
        if (!showHighlights && !showPanels) {
          console.log('-------- CLEARING INTERVAL in highlightLoop ----------- ', i, showHighlights, showPanels, highlightLoopIntervalId);
          clearInterval(highlightLoopIntervalId);
          highlightLoopIntervalId = null;
          await updateGlobalState({highlighterLooping: false});
        }
        const modalDisplayed = isModalDisplayed();
        if (!modalDisplayed && Highlight && ReadyToFindWords) {
          // console.log('-------- calling findWords inside the highlightLoop, actually calling it ----------- ');
          await findWords();
        }
        if (!ReadyToFindWords) {
          await sleep(500);
        }
      } catch (e) {
        // console.log('-------- CLEARING INTERVAL in highlightLoop, Extension context invalidated ----------- ', i);
        clearInterval(highlightLoopIntervalId);
        highlightLoopIntervalId = null;
        // context is invalidated, so you can't: await updateGlobalState({highlighterLooping: false});
      }
    }, HighlightLoopFrequency);
  }
}

// This is the list of the maximum (peak) set of defaults that comes from the API server, ie known candidates in this election cycle
// Some of them will be ignored in highlighting, ie they won't be yellows, if there are endorsement possibilites that have been added for the candidate
function addToPeakDefaultsIfYellow (marker, yellows) {
  if (marker.color === '#ff6') {
    // Re-capitalize name
    const capitalizedName = marker.word.replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());

    const wordElement = {
      Color: marker.color,
      Fcolor: '#000',
      FindWords: true,
      Icon:  '',
      ShowInEditableFields: false,
      regex: capitalizedName,
      word: marker.word,
    };
    yellows.push(wordElement);
    // console.log('addToPeakDefaultsIfYellow yellows ', yellows.length, wordElement);
  }
  return yellows;
}

function mergeWordsArrays (peakDefaultHighlights){
  const hash = {};
  const ret = [];

  for(let i= 0; i < wordsArray.length; i++){
    let e = wordsArray[i];
    if (!hash[e.word]){
      hash[e.word] = true;
      ret.push(e);
    }
  }

  for (let i= 0; i < peakDefaultHighlights.length; i++){
    let e = peakDefaultHighlights[i];
    if (!hash[e.word]){
      hash[e.word] = true;
      ret.push(e);
    }
  }

  return ret;
}

function logDebugForTwoCandidates () {
  for (let i = 0; i < wordsArray.length; i++) {
    if (wordsArray[i].word === 'pete aguilar') {
      let c = 'gray';
      if (wordsArray[i].Color === '#fb6532') c = 'red';
      if (wordsArray[i].Color === '#27af72') c = 'green';
      if (wordsArray[i].Color === '#ff6')    c = 'yellow';
      console.log('~~~~~~~~~~~~~~~~~~~~~ entry to findWords() wordsArray[i].word === "pete aguilar", wordsArray[i].Color: ', c, i);
    }
    if (wordsArray[i].word === 'jake auchincloss') {
      let c = 'gray';
      if (wordsArray[i].Color === '#fb6532') c = 'red';
      if (wordsArray[i].Color === '#27af72') c = 'green';
      if (wordsArray[i].Color === '#ff6')    c = 'yellow';
      console.log('~~~~~~~~~~~~~~~~~~~~~ entry to findWords() wordsArray[i].word === "jake auchincloss", wordsArray[i].Color: ', c, i);
    }
  }
}

async function findWords () {
  const {chrome: {runtime: {sendMessage}}} = window;
  if (Object.keys(wordsArray).length > 0) {
    Highlight=false;
    let state = await getGlobalState();
    const { reloadTimeStamp, peakDefaultHighlights } = state;
    // For some slow to load pages, wait a longer time if reloading after an edit with the WebApp in an iFrame
    let highlightWarmupPeriod = reloadTimeStamp > 0 ? 10000 : 300;

    // eslint-disable-next-line complexity
    setTimeout(async function () {
      debugFgLog('ENTERING findWords: ', window.location);
      ReadyToFindWords=false;
      const t1 = performance.now();

      logDebugForTwoCandidates();

      // We only need to do a costly ballotItemHighlightsRetrieve once per session, so cache the yellows,
      // then add them into the second pass through right here
      let applyArray = wordsArray;
      if (peakDefaultHighlights && peakDefaultHighlights.length > 0) {
        applyArray = mergeWordsArrays(peakDefaultHighlights);
      }

      let myHilitor = new Hilitor();
      let highlightsObj = myHilitor.apply(applyArray, printHighlights);
      const t2 = performance.now();
      timingFgLog(t1, t2, 'myHilitor.apply in findWords took ', 8.0);

      // debugFgLog('after myHilitor.apply num highlights: ' + highlightsObj.numberOfHighlights);
      const endorsements = await getCurrentEndorsements();
      let count = highlightsObj.numberOfHighlights || endorsements.length;
      if (highlightsObj.numberOfHighlights > 0) {
        highlightMarkers = highlightsObj.markers;
        markerPositions = [];
        let yellows = [];
        for (let marker in highlightMarkers) {
          if (markerPositions.indexOf(highlightMarkers[marker].offset) === -1) {
            markerPositions.push(highlightMarkers[marker].offset);
            addToPeakDefaultsIfYellow(highlightMarkers[marker], yellows);
          }
        }
        markerPositions.sort();

        let len = Object.keys(highlightMarkers).length;
        for (let i = 0; i < len; i++) {
          let {word} = highlightMarkers[i];
          if (!uniqueNameMatches.includes(word)) {
            uniqueNameMatches.push(word);
            addElementToPositions(state.positions, { 'ballot_item_name': word });
          }
        }
        if (yellows.length) {
          await updateGlobalState({ 'positions': state.positions, 'peakDefaultHighlights': yellows });
        } else {
          await updateGlobalState({ 'positions': state.positions});
        }

        count = uniqueNameMatches.length || count;
        try {
          console.log('sending showHighlightsCount in findWords (762), count = ' + count.toString()); // always log this
          noResponseSendMessageWrapper (sendMessage, {
            command: 'showHighlightsCount',
            label: uniqueNameMatches.length.toString(),
            uniqueNames: uniqueNameMatches,
            altColor: uniqueNameMatches.length ? '' : 'darkgreen',
          }, '^^^^^^^^^^^^^^^^^^^ sendMessage showHighlightsCount #1 in findWords');
        } catch (e) {
          debugFgLog('Caught showHighlightsCount > 0: ', e);
        }
      } else {
        try {
          // May 31, 2023, this is reusing the positions state var that is needed for something else?
          count = state.positions.length || count;
          if (count > 0) {
            console.log('sending showHighlightsCount in findWords (782), based on positions: ', count.toString()); // always log this
            noResponseSendMessageWrapper (sendMessage, {
              command: 'showHighlightsCount',
              label: count.toString(),
              uniqueNames: state.positions,
              altColor: 'darkgreen',
            }, '^^^^^^^^^^^^^^^^^^^ sendMessage showHighlightsCount #2 in findWords');
          } else {
            noResponseSendMessageWrapper (sendMessage, {
              command: 'showHighlightsCount',
              label: '0',
              uniqueNames: [],
              altColor: 'darkgreen',
            }, '^^^^^^^^^^^^^^^^^^^ sendMessage showHighlightsCount #3 in findWords');
          }
        } catch (e) {
          debugFgLog('Caught showHighlightsCount === 0 ', e);
        }
      }
      //setTimeout(function () {
      ReadyToFindWords = true;
      //}, HighligthCooldown);
    }, highlightWarmupPeriod);
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
  window.addEventListener('message', function (e) {
    // debugFgLog('tabWordHighlighter (editing existing) receiving close message from iFrame: ', e.data);
    if (e.data === 'closeIFrameDialog') {
      // debugFgLog('closing iFrame dialog after editing existing endorsement');
      closeIFrameDialog();
    }
  }, false);

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
// async function getDisplayedTabStatus (tabId) {
//   const state = await getGlobalState();
//   const { highlighterEditorEnabled, highlighterEnabledThisTab, editorEnabledThisTab } = state;
//   debugFgLog('getDisplayedTabStatus tabId: ' + tabId + ', highlighterEnabledThisTab: ' + highlighterEnabledThisTab + ', highlighterEditorEnabled: ' + highlighterEditorEnabled);
//   return {
//     highlighterEnabledThisTab,
//     editorEnabledThisTab,
//   };
// }

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
