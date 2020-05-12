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


$(() => {
  // 5/11/20 This commented out code would be great, it would eliminate all the noise from iFrames on the endorsement page, but for some reason it breaks
  // our highlighting when we purposefully put it into an iFrame for "Open Edit Pane for this Tab"
  // if(isInANonWeVoteIFrame()) {
  //   // If we are in an iFrame on the Endorsement Page eg. addthis.com, syndication.twitter.com, hotjars.com etc.
  //   // Don't do any futher processing of this instance, that will not show up in the chrome.tabs.query requests
  //   console.log('############ tabWordHighligher initial DID NOT PROCESS iframed url: ', window.location.href);
  //   return;
  // }
  debug && console.log('############ tabWordHighligher initialzed with url: ', window.location.href);

  if (window.location.href === 'about:blank') {
    console.log('tabWordHighlighter not initializing for an "about:blank" page');
    return;
  }

  const { chrome: { runtime: { sendMessage, lastError } } } = window;
  weContentState.neverHighlightOn = defaultNeverHighlightOn;

  if (isInOurIFrame()) {
    sendMessage({
      command: 'myTabId',
    }, function (response) {
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("myTabId")', lastError.message);
      }

      const {tabId: tab} = response;
      weContentState.tabId = tab;
      // console.log('tabWordHighlighter this tab.id: ' + tabId);
    });

    // console.log('Hack that sets debugLocal to true in place ------------------------------------');
    // window.debugLocal = true;
  }

  // If not in our iFrame
  if (!isInOurIFrame() && !isInANonWeVoteIFrame()) {
    // Check to see if we are on the WebApp signin page, and capture the device id if signed in
    if (window.location.host.indexOf('wevote.us') > -1 || window.location.host.indexOf('localhost:3000') > -1) {
      const voterDeviceId = getVoterDeviceIdFromWeVoteDomainPage();
      if (voterDeviceId.length) {
        sendMessage({
          command: 'storeDeviceId',
          voterDeviceId
        }, function (response) {
          if (lastError) {
            console.warn('chrome.runtime.sendMessage("storeDeviceId")', lastError.message);
          }
        });
      }
    }
    //only listen for messages in the main page, not in iframes
    chrome.runtime.onMessage.addListener(
      // eslint-disable-next-line complexity
      function (request, sender, sendResponse) {
        debug && console.log('onMessage.addListener() in tabWordHighlighter got a message: ' + request.command);

        if (sender.id === 'pmpmiggdjnjhdlhgpfcafbkghhcjocai' ||
            sender.id === 'highlightthis@deboel.eu') {

          if (request.command === 'displayHighlightsForTabAndPossiblyEditPanes') {
            if (window.location.href.toLowerCase().endsWith('.pdf')) {
              console.log('displayHighlightsForTabAndPossiblyEditPanes skipping PDF file');
              return false;
            }
            const {priorHighligherEnabledThisTab} = weContentState;
            const {highlighterEnabled, showHighlights, showEditor, tabId} = request;
            clearPriorDataOnModeChange(showHighlights, showEditor);
            weContentState.highlighterEnabled = highlighterEnabled;
            weContentState.highlighterEnabledThisTab = showHighlights;  // Will always be true if showEditor is true
            weContentState.highlighterEditorEnabled = showEditor;
            if (tabId > 0) weContentState.tabId = tabId;
            console.log('displayHighlightsForTabAndPossiblyEditPanes request.showHighlights ', showHighlights, ', showEditor: ', showEditor, ', tabId: ', weContentState.tabId, ', href: ', window.location.href);
            if (!showHighlights) {
              // if we were enabled (master switch), and now we are not, reload the page -- if this proves to be a problem, we could remove the highlighting in the DOM.
              console.log('displayHighlightsForTabAndPossiblyEditPanes (before reload)');
              weContentState.priorData = [];
              weContentState.priorHighligherEnabledThisTab = false;
              location.reload();
            }
            if (window.location.href !== 'about:blank' && weContentState.highlighterEnabledThisTab) {  // Avoid worthless queries
              displayHighlightingAndPossiblyEditor(weContentState.highlighterEnabledThisTab, weContentState.highlighterEditorEnabled, weContentState.tabId);
            }
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
          } else if (request.command === 'getTabStatusValues') {
            const encodedHref = encodeURIComponent(location.href);
            const {orgName, organizationWeVoteId, organizationTwitterHandle, tabId, highlighterEnabledThisTab, highlighterEditorEnabled} = weContentState;
            console.log('getTabStatusValues tabId: ', tabId, ', highlighterEnabledThisTab: ', highlighterEnabledThisTab, ', highlighterEditorEnabled: ', highlighterEditorEnabled, ', href: ', window.location.href);
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
          } else {
            console.error('tabWordHighlighter in chrome.runtime.onMessage.addListener received unknown command: ' + request.command);
            return false;
          }
        }
      }
    );
  } else {
    debug && console.log('not in a unframed endorsement page: ', window.location);
  }

  if (window.location.href !== 'about:blank') {  // Avoid worthless queries
    sendGetStatus();  // Initial get statos
  }
});

function jumpNext () {
  if (markerCurrentPosition === markerPositions.length - 1 || markerCurrentPosition > markerPositions.length - 1) {
    markerCurrentPosition = -1;
  }
  markerCurrentPosition += 1;
  $(window).scrollTop(markerPositions[markerCurrentPosition] - (window.innerHeight / 2));
  //document.body.scrollTop=markerPositions[markerCurrentPosition]-(window.innerHeight/2);
}

function showMarkers () {
  debug && console.log('STEVE, background showMarkers');
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
  // console.log('function reHighlight(words)');
  for (let group in words) {
    if (words[group].Enabled) {
      for (word in words[group].Words) {
        debug && console.log('reHighlight word = ' + word);
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
          console.warn('Null word in rehighlight');
        }
      }
    }
  }
  console.log('reHighlight before findWords --------------------------- namesToIds: ', namesToIds, ', tabId: ', weContentState.tabId);

  findWords();
}

function getVoterDeviceIdFromWeVoteDomainPage () {
  // Capture the voter_device_id if we are on a wevote page
  const tag = 'voter_device_id';
  let b = document.cookie.match('(^|[^;]+)\\s*' + tag + '\\s*=\\s*([^;]+)');
  let id = b ? b.pop() : '';
  debug && console.log('getVoterDeviceIdFromWeVoteDomainPage ------------TE--------------> ' + id);
  return id;
}

// When a tab sends the getStatus message, it starts a whole sequence of events and other messages, that go to the API server
// and retrieves the appropriate candidate names, brings them back to the extension, and then starts highlighting the candidate names
// on the endorsement page that is displayed in the tab (for example, https://www.sierraclub.org/california/2020-endorsements/).
function sendGetStatus () {
  const {chrome: {runtime: {sendMessage, lastError}}} = window;

  for (let i = 0; i < weContentState.neverHighlightOn.length; i++) {
    let reg = new RegExp(weContentState.neverHighlightOn[i].replace('*', '.*?'));
    if (window.location.hostname.match(reg)) {
      debug && console.log('sendGetStatus found a neverHighlightOn match: ', window.location.hostname);
      return;
    }
  }

  sendMessage({command: 'getStatus', tabURL: window.location.href}, function (response) {
    console.log('chrome.runtime.sendMessage({command: \'getStatus\'}', document.URL);
    if (lastError) {
      console.warn('chrome.runtime.sendMessage("getStatus")', lastError.message);
      return;
    }
    const { highlighterEnabled, neverHighlightOn, showHighlights, showEditor, tabId, url } = response;
    debug && console.log('response from getStatus', response);

    // if (!existenceOfTab) {
    //   console.log('"getStatus called for a url that is not a tabUrl, probably for an iframe within a tab: ', url);
    //   return;
    // }

    // bs detector, work around a likely chrome.tabs bug - May, 2020
    if (url && !url.includes(window.location.host)) {
      console.warn('sendMessage for getStatus aborted on page ', window.location.host, ' returned url: ', url, ', with probably wrong tab id: ', tabId);
      return;
    }

    clearPriorDataOnModeChange(showHighlights, showEditor);
    weContentState.highlighterEnabled = highlighterEnabled;
    weContentState.highlighterEnabledThisTab  = showHighlights;
    weContentState.highlighterEditorEnabled = showEditor;
    if (tabId > 0) weContentState.tabId = tabId;
    weContentState.neverHighlightOn = neverHighlightOn && neverHighlightOn.length ? neverHighlightOn : weContentState.neverHighlightOn;

    // tabId = responseTabId;  Since this works in our iFrame,  a lot of the other startup is unnecessary TODO: April 26, 2020, do we even need 'myTabId' msg chain?
    if (weContentState.highlighterEnabledThisTab) {
      debug && console.log('about to get words', window.location);
      getWordsThenStartHighlighting();
    }
  });
}

function clearPriorDataOnModeChange (showHighlights, showEditor) {
  if ((!showHighlights && !showEditor) ||
    (weContentState.highlighterEnabledThisTab && weContentState.highlighterEditorEnabled !== showEditor)) {
    weContentState.priorData = [];  // Needed to avoid the 'unchanged data ... abort' when swapping display editor/highlights only
  }
}

function getWordsThenStartHighlighting () {
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  console.log('Called \'getWords\' in getWordsThenStartHighlighting');

  sendMessage({
    command: 'getWords',
    url: location.href.replace(location.protocol + '//', ''),
    id: getVoterDeviceIdFromWeVoteDomainPage()  // is this nonsense?
  }, function (response) {
    const { url, storedDeviceId, words } = response;
    console.log('Received response getWordsThenStartHighlighting() URL: ', url);

    if (lastError) {
      console.warn('chrome runtime sendMessage("getWords")',lastError.message);
      return;
    }
    console.log('got words response: ', response);
    const id = storedDeviceId ? storedDeviceId : '';
    if (storedDeviceId && storedDeviceId.length > 0) {
      voterDeviceId = id;
    }

    for (let group in words) {
      if (words[group].Enabled) {
        for (word in words[group].Words) {
          debug && console.log('getWords response, ' + word + ', group: ' + group + ', findWords: ' + words[group].FindWords + ' icon: ' + words[group].Icon);
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

    if (words.nameToIdMap) {
      namesToIds = words.nameToIdMap;  // This is the one that delivers, when in an iFrame.  It probably is all we need if not in a frame.
    }

    debug && console.log('processed words');
    wordsReceived = true;

    //start the highlight loop
    highlightLoop();

    if (!document.getElementById('wediv')) {
      // console.log('inserting wediv for the dialog into the top of the body');
      const head = document.head || document.getElementsByTagName('head')[0];

      const style = document.createElement('style');
      head.append(style);
      style.type = 'text/css';
      // Note that the source code for this css is in popupIFrame.html, where it can be tested in a browser, then minified with https://cssminifier.com/
      const css = '#wediv{position:absolute;z-index:10000;background-color:#000;text-align:center;border:1px solid #d3d3d3;box-shadow:10px 10px 5px 0 rgba(0,0,0,.4);height:600px;}#wedivheader{cursor:move;z-index:10;background-color:#2e3c5d;color:#fff;height:30px}#weIFrame{width:450px;height:568px;border-width:0;border:none}#wetitle{float:left;margin-left:8px;margin-top:2px}.weclose{height:10px;width:10px;float:right;margin-right:16px;background-color:#2e3c5d;color:#fff;border:none;font-weight:bolder;font-stretch:extra-expanded;font-size:12pt}.highlight{padding:1px;box-shadow:#e5e5e5 1px 1px;border-radius:3px;-webkit-print-color-adjust:exact;background-color:#ff6;color:#000;font-style:inherit}';
      style.appendChild(document.createTextNode(css));

      const js = document.createElement('script');
      // Note that the source code for this innerHTML is in popupIFrame.html, where it can be tested, then minified with https://javascript-minifier.com/
      js.innerHTML ='function dragElement(e){let t=0,n=0,o=0,l=0;function d(e){(e=e||window.event).preventDefault(),o=e.clientX,l=e.clientY,document.onmouseup=s,document.onmousemove=f}function f(d){(d=d||window.event).preventDefault(),t=o-d.clientX,n=l-d.clientY,o=d.clientX,l=d.clientY,e.style.top=e.offsetTop-n+"px",e.style.left=e.offsetLeft-t+"px"}function s(){document.onmouseup=null,document.onmousemove=null}document.getElementById(e.id+"header")?document.getElementById(e.id+"header").onmousedown=d:e.onmousedown=d}function setModal(e,t,n){let o=document.getElementById(n);o||(o={offsetLeft:0,offsetTop:0});const l=document.getElementById("wediv"),d=document.getElementById("weIFrame"),f=window.pageYOffset||document.documentElement.scrollTop;l.hidden=!e,l.style.left=o.offsetLeft+300+"px",l.style.top=o.offsetTop+f+"px",t&&t.length&&(d.src=t),dragElement(l)}';
      // js.onload = () => console.log('------------- js loaded');
      head.appendChild(js);
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
        '<iframe id="weIFrame" src="' + extensionWarmUpPage + '"></iframe>\n';
      $('body').first().prepend(markup);
      if (isInOurIFrame()) {
        preloadPositionsForAnotherVM();  // preLoad positions for this VM, if it is a VM within an iFrame
      }
      $('.weclose').click(() => {
        const dialogClosed = true;
        if (isInOurIFrame()) { // if in an iframe
          console.log('With editors displayed, and the endorsement page in an iFrame, the modal containing an iFrame to the webapp has closed.  Evaluating the need to update the PositionsPanel, weContentState ', weContentState);
          updatePositionPanelFromTheIFrame(dialogClosed);  // which calls getRefreshedHighlights() if the positions data has changed
        } else {
          console.log('dialog containing iFrame has closed, either without the editor displayed, or for newly discovered positions, ie right click on highlighed position');
          updateHighlightsIfNeeded(dialogClosed);
        }
      });
    }
  });
}

$(document).ready(function () {
  Highlight=true;

  debug && console.log('setup binding of dom sub tree modification');
  $('body').bind('DOMSubtreeModified', function () {
    //debug && console.log("dom sub tree modified");
    Highlight=true;
  });
});


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
    debug && console.log("in start");
    if (wordsReceived == true) {
        debug && console.log("in start - words received");
        Highlight=true
        $("body").bind("DOMSubtreeModified", function () {
            debug && console.log("dom sub tree modified", readyToFindWords);
            Highlight=true;
        });
    }
    else {
        setTimeout(function () {
            debug && console.log('waiting for words');
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
//   console.log($('#weContainer').html());
//
//   $('em.Highlight').each((em) => {
//     let text = $(em).text();
//     console.log('removeAll: ' + i + ', ' + text);
//     $(em).replace(text);
//   });
//   // ems.replaceWith(ems.innerText);
// }


function findWords () {
  const {chrome: {runtime: {sendMessage, lastError}}} = window;
  if (Object.keys(wordsArray).length > 0) {
    Highlight=false;

    setTimeout(function () {
      debug && console.log('finding words',window.location);

      ReadyToFindWords=false;

      var changed = false;
      var myHilitor = new Hilitor();
      var highlights = myHilitor.apply(wordsArray, printHighlights);
      // console.log('after myHilitor.apply num highlights: ' + highlights.numberOfHighlights);
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
          sendMessage({
            command: 'showHighlightsCount',
            label: uniqueNameMatches.length.toString(),
            uniqueNames: uniqueNameMatches,
            altColor: uniqueNameMatches.length ? '' : 'darkgreen',
          }, function (response) {
            if (lastError) {
              console.warn('findWords() ... chrome.runtime.sendMessage("showHighlightsCount")', lastError.message);
            }
          });
        } catch (e) {
          console.log('Caught showHighlightsCount > 0: ', e);
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
              console.warn(' chrome.runtime.sendMessage("showHighlightsCount")', lastError.message);
            }
          });
        } catch (e) {
          console.log('Caught showHighlightsCount === 0 ', e);
        }

      }
      //setTimeout(function () {
      ReadyToFindWords = true;
      //}, HighligthCooldown);
    }, HighlightWarmup);
  }

  // This following log line floods the log, and slow things down -- use sparingly while debugging
  // debug && console.log('finished finding words');
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
  debug && console.log('getDisplayedTabStatus tabId: ' + tabId + ', highlighterEnabledThisTab: ' + highlighterEnabledThisTab + ', highlighterEditorEnabled: ' + highlighterEditorEnabled);
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
