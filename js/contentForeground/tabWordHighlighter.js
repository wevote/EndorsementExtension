// Content scripts are the only component of an extension that has access to the web-page's DOM. (this js file and contentWeVoteUI!)
// Chrome extensions Treat these as the contact script, and create nn instance of a pair of them, for every tab which the background Scripps communicate.
// As far as loging and access is concerned, these are part of the DOM and JavaScript of the endorsement page.
// These log to the console of the endorsement page (like sierraclub.org) in the browser, Aand communicate with the background script via chrome extension messages that are sent.
// When the endorsement page is re-opened in an iframe, access to that DOM is greatly limited.

/* global preloadPositionsForAnotherVM, updatePositionPanelFromTheIFrame, updateHighlightsIfNeeded */

/* eslint no-unused-vars: 0 */
/* eslint init-declarations: 0 */
/* eslint no-empty-function: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-mixed-operators: 0 */
/* eslint no-undef: 0 */
/* eslint multiline-ternary: 0 */
/* eslint no-ternary: 0 */
// import jQuery from 'libs/jquery/jquery-3.6.0';

var wordsArray = [];
var namesToIds;
var ReadyToFindWords = true; //indicates if not in a highlight execution

var Highlight=true; // indicates if the extension needs to highlight at start or due to a change. This is evaluated in a loop
var HighlightLoopFrequency=300; // the frequency of checking if a highlight needs to occur
var HighlightLoop;
var HighlightWarmup=300; // min time to wait before running a highlight execution

var alreadyNotified = false;
var wordsReceived = false;
var searchEngines = {
  'google.com': 'q',
  'bing.com': 'q'
};
var markerCurrentPosition = -1;
var markerPositions = [];
var highlightMarkers = {};
var markerScroll = false;
var printHighlights = true;
let voterInfo = {};
let uniqueNameMatches = [];
let voterDeviceId = '';
var debug = false;
let urlsForHighlights = {};

// importScripts(
//   'libs/jquery/jquery-3.6.0',
// );
// const jq = chrome.runtime.getURL('libs/jquery/jquery-3.6.0');
// const script = document.createElement('img');
// img.src = chrome.runtime.getURL('logo.png');
// document.body.append(img);
// const $ = jQuery;

document.addEventListener('DOMContentLoaded', function () {
  if (jQuery === undefined) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('./libs/jquery/jquery-3.6.0.min.js');
    script.type = 'text/javascript';
    document.body.append(script);
  }
  console.log(`jQuery ${$.fn.jquery} has been loaded successfully!`);
  // use jQuery below
  initializeTabWordHighlighter();
  detectBodyBind();
});



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
function initializeTabWordHighlighter () {
  if (window.location.href === 'about:blank' || window.location.href.includes('extension.html')) {
    debugFgLog('############ tabWordHighligher NOT initializing for:', window.location.href);
    return;
  } else {
    debugFgLog('############ tabWordHighligher initialzed with url: ', window.location.href);
  }

  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  weContentState.neverHighlightOn = defaultNeverHighlightOn;

  const deb = $('div#wedivheader').length > 0;
  const host = window.location.host;

  if (isInOurIFrame()) {
    sendMessage({
      command: 'myTabId',
    }, function (response) {
      if (lastError) {
        debugFgLog(' chrome.runtime.sendMessage("myTabId")', lastError.message);
      }

      const {tabId: tab} = response;
      $('#frame').attr('name', 'tabId=' + tabId);
      weContentState.tabId = tab;  // TODO: 7/8/22  this looks wrong
      debugFgLog('tabWordHighlighter this tab.id: ' + tabId);
    });
    debugFgLog('Hack that sets debugLocal to true in place ------------------------------------');
    window.debugLocal = true;
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
          // TODO: wtf, chrome.storage.local.set({'voterDeviceId': junk});
          // ((store) => {
          //   if(chrome.runtime.lastError) {
          //     console.error(
          //       'Error setting voterDeviceId to ' + JSON.stringify(voterDeviceId) +
          //       ': ' + chrome.runtime.lastError.message
          //     );
          //   }
          console.log('initializeTabWordHighlighter voterDeviceId Value set to ', junk);
          // });
        });

        // sendMessage({
        //   command: 'storeDeviceId',
        //   voterDeviceId
        // }, function (response) {
        //   if (lastError) {
        //     debugFgLog('chrome.runtime.sendMessage("storeDeviceId")', lastError.message);
        //   }
        // });
      }
    }
    //only listen for messages in the main page, not in iframes
    chrome.runtime.onMessage.addListener(
      // eslint-disable-next-line complexity
      function (request, sender, sendResponse) {
        const tabWordHighlighterListenerDebug = true;
        tabWordHighlighterListenerDebug && debugFgLog('onMessage.addListener() in tabWordHighlighter got a message: ', request, sender, sendResponse);

        if (sender.id === 'pmpmiggdjnjhdlhgpfcafbkghhcjocai' ||
            sender.id === 'lfifjogjdncflocpmhfhhlflgndgkjdo' ||
            sender.id === 'eofojjpbgfdogalmibgljcgdipkhoclc' ||
            sender.id === 'ikoadphkdpbhakeghnjpepfgnodmonpk' ||
            sender.id === 'highlightthis@deboel.eu') {

          if (request.command === 'displayHighlightsForTabAndPossiblyEditPanes') {
            if (window.location.href.toLowerCase().endsWith('.pdf')) {
              debugFgLog('displayHighlightsForTabAndPossiblyEditPanes skipping PDF file');
              return false;
            }
            const t1 = performance.now();
            const {priorHighlighterEnabledThisTab} = weContentState;
            const {highlighterEnabled, showHighlights, showEditor, tabId} = request;
            clearPriorDataOnModeChange(showHighlights, showEditor);
            weContentState.highlighterEnabled = highlighterEnabled;
            weContentState.highlighterEnabledThisTab = showHighlights;  // Will always be true if showEditor is true
            weContentState.highlighterEditorEnabled = showEditor;
            if (tabId > 0) weContentState.tabId = tabId;
            debugFgLog('------------------------------- ENTERING tabWordHighlighter > displayHighlightsFo');
            debugFgLog('ENTERING tabWordHighlighter > displayHighlightsForTabAndPossiblyEditPanes request.showHighlights: ', showHighlights, ', showEditor: ', showEditor, ', tabId: ', weContentState.tabId, ', href: ', window.location.href);
            if (!showHighlights) {
              // if we were enabled (master switch), and now we are not, reload the page -- if this proves to be a problem, we could remove the highlighting in the DOM.
              debugFgLog('displayHighlightsForTabAndPossiblyEditPanes (before reload)');
              weContentState.priorData = [];
              weContentState.priorHighlighterEnabledThisTab = false;
              location.reload();
            }
            if (window.location.href !== 'about:blank' && weContentState.highlighterEnabledThisTab) {  // Avoid worthless queries
              displayHighlightingAndPossiblyEditor(weContentState.highlighterEnabledThisTab, weContentState.highlighterEditorEnabled, weContentState.tabId);
            }
            const t2 = performance.now();
            timingFgLog(t1, t2, 'displayHighlightsForTabAndPossiblyEditPanes processing took', 8.0);
            return false;
          } else if (request.command === 'ScrollHighlight') {
            jumpNext();
            showMarkers();
            return false;
          } else if (request.command === 'getMarkers') {
            sendResponse(highlightMarkers);
            return true;
          } else if (request.command === 'ClearHighlights') {
            highlightMarkers = {};
            return false;
          } else if (request.command === 'ReHighlight') {
            weContentState.highlighterEnabled = true;
            weContentState.highlighterEnabledThisTab = true;
            reHighlight(request.words);
            return false;
          } else if (request.command === 'createEndorsement') {
            openSuggestionPopUp(request.selection);
            return false;
          } else if (request.command === 'revealRight') {
            revealRightAction(request.selection, request.pageURL, request.tabId);
            return false;
          } else if (request.command === 'getTabStatusValues' || request.command === 'getStatusForActiveTab') {
            const encodedHref = encodeURIComponent(location.href);
            const {orgName, organizationWeVoteId, organizationTwitterHandle, tabId, highlighterEnabledThisTab, highlighterEditorEnabled} = weContentState;
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
            enableHighlightsForAllTabs(false);
            return false;
          } else if (request.command === 'logFromPopup') {
            console.log('popup: ' + request.payload);
            sendResponse('hello from the tabWordHighlighter');
            return true;
          } else if (request.command === 'updateForegroundForButtonChange') {
            debugSwLog('extWordHighlighter "updateForegroundForButtonChange" received from popup');
            const { highlightThisTab, openEditPanel, pdfURL, tabId, tabUrl } = request.payload;
            console.log('updateForegroundForButtonChange: ' + request.payload);

            sendMessage({
              command: 'updateBackgroundForButtonChange',
              highlightThisTab,
              openEditPanel,
              pdfURL,
              tabId,
              tabUrl
            }, function (response) {
              if (lastError) {
                debugFgLog('chrome.runtime.sendMessage("updateBackgroundForButtonChange")', lastError.message);
              }
            });


            // handleButtonStateChange(highlightThisTab, openEditPanel, pdfURL);
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
    sendGetStatus();  // Initial get statos
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
  debugFgLog('STEVE, background showMarkers');
  var element = document.getElementById('HighlightThisMarkers');
  if (element) {
    element.parentNode.removeChild(element);
  }

  var containerElement = document.createElement('DIV');
  containerElement.id = 'HighlightThisMarkers';

  for (marker in highlightMarkers) {
    var span = document.createElement('SPAN');
    span.className = 'highlightThisMarker';
    span.style.backgroundColor = highlightMarkers[marker].color;
    var markerposition = document.body.scrollTop + (highlightMarkers[marker].offset / document.body.clientHeight) * window.innerHeight;
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
      for (word in words[group].Words) {
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
  reHighlightDebug && debugFgLog('reHighlight before findWords --------------------------- namesToIds: ', namesToIds, ', tabId: ', weContentState.tabId);

  findWords();
}

function getVoterDeviceIdFromWeVoteDomainPage () {
  // Capture the voter_device_id if we are on a wevote page
  const tag = 'voter_device_id';
  let b = document.cookie.match('(^|[^;]+)\\s*' + tag + '\\s*=\\s*([^;]+)');
  let id = b ? b.pop() : '';
  if (id.length) {
    debugFgLog('=======  voter_device_id captured from a wevote page, id: ' + id);
  }

  let voterDeviceId = '';
  if (id && id.length > 5) {
    chrome.storage.sync.get().then((all) => {
      for (const [key, val] of Object.entries(all)) {
        debugFgLog('======= voterDeviceId storage.sync ', key, val);
        if (key === 'voterDeviceId') {
          debugFgLog(`======= voterDeviceId storage.sync previous value of voterDeviceId: "${val}", new value: "${id}"`);
          voterDeviceId = val;
        }
      }
      chrome.storage.sync.set({'voterDeviceId': id}, () => {
        if (chrome.runtime.lastError) {
          console.error('chrome.storage.sync.set({\'voterDeviceId\': id}) returned error ', chrome.runtime.lastError.message);
        }
      });
    });
  }
  return voterDeviceId;
}

// When a tab sends the getStatus message, it starts a whole sequence of events and other messages, that go to the API server
// and retrieves the appropriate candidate names, brings them back to the extension, and then starts highlighting the candidate names
// on the endorsement page that is displayed in the tab (for example, https://www.sierraclub.org/california/2020-endorsements/).
function sendGetStatus () {
  const {chrome: {runtime: {sendMessage, lastError}}} = window;

  for (let i = 0; i < weContentState.neverHighlightOn.length; i++) {
    let reg = new RegExp(weContentState.neverHighlightOn[i].replace('*', '.*?'));
    if (window.location.hostname.match(reg)) {
      debugFgLog('sendGetStatus found a neverHighlightOn match: ', window.location.hostname);
      return;
    }
  }

  sendMessage({command: 'getStatus', tabURL: window.location.href}, function (response) {
    debugFgLog('chrome.runtime.sendMessage({command: \'getStatus\'}', document.URL);
    if (lastError) {
      debugFgLog('chrome.runtime.sendMessage("getStatus")', lastError.message);
      return;
    }
    debugFgLog('response from getStatus', response);
    if (response) {
      const { highlighterEnabled, neverHighlightOn, showHighlights, showEditor, tabId, url } = response;

      // if (!existenceOfTab) {
      //   debugFgLog('"getStatus called for a url that is not a tabUrl, probably for an iframe within a tab: ', url);
      //   return;
      // }

      // bs detector, work around a likely chrome.tabs bug - May, 2020
      if (url && !url.includes(window.location.host)) {
        debugFgLog('sendMessage for getStatus aborted on page ', window.location.host, ' returned url: ', url, ', with probably wrong tab id: ', tabId);
        return;
      }
    }
    highlighterEnabled = true;
    showHighlights = true;
    showEditor = false;
    tabId=985;
    neverHighlightOn=false;

    clearPriorDataOnModeChange(showHighlights, showEditor);
    weContentState.highlighterEnabled = highlighterEnabled;
    weContentState.highlighterEnabledThisTab  = showHighlights;
    weContentState.highlighterEditorEnabled = showEditor;
    if (tabId > 0) weContentState.tabId = tabId;
    weContentState.neverHighlightOn = neverHighlightOn && neverHighlightOn.length ? neverHighlightOn : weContentState.neverHighlightOn;

    // tabId = responseTabId;  Since this works in our iFrame,  a lot of the other startup is unnecessary TODO: April 26, 2020, do we even need 'myTabId' msg chain?
    if (weContentState.highlighterEnabledThisTab) {
      debugFgLog('about to get words', window.location);
      getWordsThenStartHighlighting();
    }
  });
}

function refreshVoterGuidePanel () {  // Based on updatePositionPanelFromTheIFrame
  const {chrome: {runtime: {sendMessage, lastError}}} = window;

  for (let i = 0; i < weContentState.neverHighlightOn.length; i++) {
    let reg = new RegExp(weContentState.neverHighlightOn[i].replace('*', '.*?'));
    if (window.location.hostname.match(reg)) {
      debugFgLog('refreshVoterGuidePanel found a neverHighlightOn match: ', window.location.hostname);
      return;
    }
  }

  // sendMessage({command: 'getStatus', tabURL: window.location.href}, function (response) {
  //   debugFgLog('chrome.runtime.sendMessage({command: \'getStatus\'}', document.URL);
  //   if (lastError) {
  //     debugFgLog('chrome.runtime.sendMessage("getStatus")', lastError.message);
  //     return;
  //   }
  //   const { highlighterEnabled, neverHighlightOn, showHighlights, showEditor, tabId, url } = response;
  //   debugFgLog('response from getStatus', response);
  //
  //   // if (!existenceOfTab) {
  //   //   debugFgLog('"getStatus called for a url that is not a tabUrl, probably for an iframe within a tab: ', url);
  //   //   return;
  //   // }
  //
  //   // bs detector, work around a likely chrome.tabs bug - May, 2020
  //   if (url && !url.includes(window.location.host)) {
  //     debugFgLog('sendMessage for getStatus aborted on page ', window.location.host, ' returned url: ', url, ', with probably wrong tab id: ', tabId);
  //     return;
  //   }
  const showHighlights = true;
  const showEditor = true;
  clearPriorDataOnModeChange(showHighlights, showEditor);
  weContentState.highlighterEnabled = highlighterEnabled;
  weContentState.highlighterEnabledThisTab  = showHighlights;
  weContentState.highlighterEditorEnabled = showEditor;
  // if (tabId > 0) weContentState.tabId = tabId;
  // weContentState.neverHighlightOn = neverHighlightOn && neverHighlightOn.length ? neverHighlightOn : weContentState.neverHighlightOn;
  weContentState.neverHighlightOn = false;

  // tabId = responseTabId;  Since this works in our iFrame,  a lot of the other startup is unnecessary TODO: April 26, 2020, do we even need 'myTabId' msg chain?
  if (weContentState.highlighterEnabledThisTab) {
    debugFgLog('about to get words', window.location);
    getWordsThenStartHighlighting();
  }
  // });
}

function clearPriorDataOnModeChange (showHighlights, showEditor) {
  if ((!showHighlights && !showEditor) ||
    (weContentState.highlighterEnabledThisTab && weContentState.highlighterEditorEnabled !== showEditor)) {
    weContentState.priorData = [];  // Needed to avoid the 'unchanged data ... abort' when swapping display editor/highlights only
  }
}

function getWordsThenStartHighlighting () {
  const getWordsThenStartHighlightingDebug = true;
  const t1 = performance.now();
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  getWordsThenStartHighlightingDebug && debugFgLog('ENTERING tabWordHighlighter > getWordsThenStartHighlighting,  Called \'getWords\'');

  sendMessage({
    command: 'getWords',
    url: location.href.replace(location.protocol + '//', ''),
    voterDeviceId: getVoterDeviceIdFromWeVoteDomainPage(),  // is this nonsense?
    tabId: weContentState.tabId,
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
        for (word in words[group].Words) {
          debugFgLog('getWords response, ' + word + ', group: ' + group + ', findWords: ' + words[group].FindWords + ' icon: ' + words[group].Icon);
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
      // debugFgLog('inserting wediv for the dialog into the top of the body');
      const head = document.head || document.getElementsByTagName('head')[0];

      const style = document.createElement('style');
      head.append(style);
      style.type = 'text/css';
      // Note that the source code for this css is in popupIFrame.html, where it can be tested in a browser, then minified with https://cssminifier.com/
      const css = '#wediv{position:absolute;z-index:10000;background-color:#000;text-align:center;border:1px solid #d3d3d3;box-shadow:10px 10px 5px 0 rgba(0,0,0,.4);height:600px;}#wedivheader{cursor:move;z-index:10;background-color:#2e3c5d;color:#fff;height:30px}#weIFrame{width:450px;height:568px;border-width:0;border:none}#wetitle{float:left;margin-left:8px;margin-top:2px}.weclose{height:10px;width:10px;float:right;margin-right:16px;background-color:#2e3c5d;color:#fff;border:none;font-weight:bolder;font-stretch:extra-expanded;font-size:12pt}.highlight{padding:1px;box-shadow:#e5e5e5 1px 1px;border-radius:3px;-webkit-print-color-adjust:exact;background-color:#ff6;color:#000;font-style:inherit}';
      style.appendChild(document.createTextNode(css));

      const tabId = weContentState.tabId;


      //  7/4/22:  Don't need to inject script, since we can just include it in manifest
      // const js = document.createElement('script');
      // // Note that the source code for this innerHTML is in popupIFrame.html, where it can be tested, then minified with https://javascript-minifier.com/
      // js.innerHTML ='function dragElement(e){let t=0,n=0,o=0,l=0;function d(e){(e=e||window.event).preventDefault(),o=e.clientX,l=e.clientY,document.onmouseup=s,document.onmousemove=f}function f(d){(d=d||window.event).preventDefault(),t=o-d.clientX,n=l-d.clientY,o=d.clientX,l=d.clientY,e.style.top=e.offsetTop-n+"px",e.style.left=e.offsetLeft-t+"px"}function s(){document.onmouseup=null,document.onmousemove=null}document.getElementById(e.id+"header")?document.getElementById(e.id+"header").onmousedown=d:e.onmousedown=d}function setModal(e,t,n){let o=document.getElementById(n);o||(o={offsetLeft:0,offsetTop:0});const l=document.getElementById("wediv"),d=document.getElementById("weIFrame"),f=window.pageYOffset||document.documentElement.scrollTop;l.hidden=!e,l.style.left=o.offsetLeft+300+"px",l.style.top=o.offsetTop+f+"px",t&&t.length&&(d.src=t),dragElement(l)}';
      // js.onload = () => debugFgLog('------------- js loaded');
      // head.appendChild(js);
      const markup = document.createElement('div');
      markup.id = 'wediv';
      markup.hidden = true;
      markup.innerHTML =
        '<div id="wedivheader">\n' +
        '  <span id="wetitle"></span>\n' +
        '  <span id="closeButton">\n' +
        '    <button type="button" class="weclose" onclick="setModal(false,\'\' ,\'\')">X</button>\n' +
        '  </span>\n' +
        '</div>\n' +
        '<iframe id="weIFrame" src="' + extensionWarmUpPage + '" name="tabId="></iframe>\n';
      $('body').first().prepend(markup);
      if (isInOurIFrame()) {
        preloadPositionsForAnotherVM();  // preLoad positions for this VM, if it is a VM within an iFrame
      }
      $('.weclose').click(() => {
        const dialogClosed = true;
        if (isInOurIFrame()) { // if in an iframe
          debugFgLog('With editors displayed, and the endorsement page in an iFrame, the modal containing an iFrame to the webapp has closed.  Evaluating the need to update the PositionsPanel, weContentState ', weContentState);
          updatePositionPanelFromTheIFrame(dialogClosed);  // which calls getRefreshedHighlights() if the positions data has changed
        } else {
          debugFgLog('dialog containing iFrame has closed, either without the editor displayed, or for newly discovered positions, ie right click on highlighed position');
          updateHighlightsIfNeeded(dialogClosed);
        }
      });
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

  HighlightLoop = setInterval(function () {
    Highlight&&ReadyToFindWords&&findWords();
  }, HighlightLoopFrequency);

}

function getSearchKeyword () {
  let searchKeyword = null;
  if (document.referrer) {
    for (searchEngine in searchEngines) {
      if (document.referrer.indexOf(searchEngine)) {
        searchKeyword = getSearchParameter(searchEngines[searchEngine]);
      }
    }
  }
  return searchKeyword;
}

function getSearchParameter (n) {
  const half = document.referrer.split(n + '=')[1];
  return half !== undefined ? decodeURIComponent(half.split('&')[0]) : null;
}

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
//   var arr = document.getElementsByTagName('EM');
//   var fd = document.getElementById('frameDiv');
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
  const findWordsDebug = true;
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  if (Object.keys(wordsArray).length > 0) {
    Highlight=false;

    setTimeout(function () {
      debugFgLog('ENTERING findWords: ', window.location);

      ReadyToFindWords=false;

      var changed = false;

      const t1 = performance.now();
      var myHilitor = new Hilitor();
      var highlights = myHilitor.apply(wordsArray, printHighlights);
      const t2 = performance.now();
      timingFgLog(t1, t2, 'in findWords, Hilitor (apply) took', 8.0);

      // debugFgLog('after myHilitor.apply num highlights: ' + highlights.numberOfHighlights);
      if (highlights.numberOfHighlights > 0) {
        highlightMarkers = highlights.markers;
        markerPositions = [];
        for (marker in highlightMarkers) {
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
          debugFgLog('showHighlightsCount in tabWordHigligher');
          sendMessage({
            command: 'showHighlightsCount',
            label: uniqueNameMatches.length.toString(),
            uniqueNames: uniqueNameMatches,
            altColor: uniqueNameMatches.length ? '' : 'darkgreen',
          }, function (response) {
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
          }, function (response) {
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

  // This following log line floods the log, and slows things down -- use sparingly while debugging
  // debug && debugFgLog('finished finding words');
}

function revealRightAction (selection, pageURL, tabId) {
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
function getDisplayedTabStatus (tabId) {
  const { highlighterEnabledThisTab, highlighterEditorEnabled} = weContentState;
  debugFgLog('getDisplayedTabStatus tabId: ' + tabId + ', highlighterEnabledThisTab: ' + highlighterEnabledThisTab + ', highlighterEditorEnabled: ' + highlighterEditorEnabled);
  return {
    highlighterEnabledThisTab,
    editorEnabledThisTab,
  };
}

function globStringToRegex (str) {
  return preg_quote(str).replace(/\\\*/g, '\\S*').replace(/\\\?/g, '.');
}

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
