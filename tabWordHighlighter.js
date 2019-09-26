// Content scripts are the only component of an extension that has access to the web-page's DOM. (this js file!)
// Logs to the console of the page in the browser, not the one you open from the extensions page

/* eslint no-unused-vars: 0 */
/* eslint init-declarations: 0 */
/* eslint no-empty-function: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-mixed-operators: 0 */
/* eslint no-undef: 0 */
/* eslint multiline-ternary: 0 */
/* eslint no-ternary: 0 */

var wordsArray = [];

var ReadyToFindWords = true; //indicates if not in a highlight execution

var Highlight=true; // indicates if the extension needs to highlight at start or due to a change. This is evaluated in a loop
var HighlightLoopFrequency=300; // the frequency of checking if a highlight needs to occur
var HighlightLoop;
var HighlightWarmup=300; // min time to wait before running a highlight execution

var alreadyNotified = false;
var wordsReceived = false;
var highlighterEnabled = true;
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

// https://projects.sfchronicle.com/2018/voter-guide/endorsements-list/

$(() => {
  // console.log("tabWordHighlighter constructor");

  if (window.location === window.parent.location) {
    //only listen for messages in the main page, not in iframes
    chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
        /* debug && */
        console.log('got a message', request);

        if (sender.id === 'pmpmiggdjnjhdlhgpfcafbkghhcjocai' ||
            sender.id === 'eofojjpbgfdogalmibgljcgdipkhoclc' ||
            sender.id === 'abcibokldhgkclhihipipbiaednfcpia' ||
            sender.id === 'fgmbnmjmbjenlhbefngfibmjkpbcljaj' ||
            sender.id === 'highlightthis@deboel.eu') {

          if (request.command === 'openWeMenus') {
            displayWeVoteUI(request.enabled);
            return false;
          } else if (request.command === 'ScrollHighlight') {
            jumpNext();
            showMarkers();
            return false
          } else if (request.command === 'getMarkers') {
            sendResponse(highlightMarkers);
            return true;
          } else if (request.command === 'ClearHighlights') {
            highlightMarkers = {};
            return false;
          } else if (request.command === 'ReHighlight') {
            // let testWords = request.words["Default Group"].Words;
            // testWords.push("Dianne")
            reHighlight(request.words);
            return false;
          } else if (request.command === 'createEndorsement') {
            openSuggestionPopUp(request.selection, request.pageURL, request.tabId);
            return false;
          } else  {
            console.error('tabWordHighligher in chrome.runtime.onMessage.addListener received unknown command: ' + request.command);
            return false;
          }
        }
      }
    );
  } else {
    debug && console.log('not in main page', window.location)
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
  debug&&console.log('Steve, background showMarkers');
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
  debug&&console.log('function reHighlight(words)');
  for (let group in words) {
    if (words[group].Enabled) {
      for (word in words[group].Words) {
        debug&&console.log('reHighlight word = ' + word);
        wordsArray.push({
          word: words[group].Words[word].toLowerCase(),
          'regex': globStringToRegex(words[group].Words[word]),
          'Color': words[group].Color,
          'Fcolor': words[group].Fcolor,
          'FindWords': words[group].FindWords,
          'ShowInEditableFields': words[group].ShowInEditableFields
        });
      }
    }
  }
  findWords();
}

function getVoterDeviceIdFromWeVoteDomainPage () {
  // Capture the voter_device_id if we are on a wevote page
  const tag = 'voter_device_id';
  let b = document.cookie.match('(^|[^;]+)\\s*' + tag + '\\s*=\\s*([^;]+)');
  return b ? b.pop() : '';
}

// this is just inline, so it gets executed on startup
chrome.runtime.sendMessage({command: 'getStatus'}, function (response) {
  let lastError = chrome.runtime.lastError;
  if (lastError) {
    console.warn('chrome.runtime.sendMessage("getStatus")', lastError.message);
    return;
  }
  debug&&console.log('reponse from getStatus',window.location);
  highlighterEnabled = response.status;
  printHighlights = response.printHighlights;
  if (highlighterEnabled) {
    debug&&console.log('about to get words',window.location);

    getWordsThenStartHighlighting();
  }
});

function getWordsThenStartHighlighting () {
  console.log('Called getWordsThenStartHighlighting()');
  chrome.runtime.sendMessage({
    command: 'getWords',
    url: location.href.replace(location.protocol + '//', ''),
    id: getVoterDeviceIdFromWeVoteDomainPage()  // is this nonsense?
  }, function (response) {
    console.log('Received response in getWordsThenStartHighlighting');

    let lastError = chrome.runtime.lastError;
    if (lastError) {
      console.warn('chrome runtime sendMessage("getWords")',lastError.message);
      return;
    }
    debug&&console.log('got words response: ', response);
    const id = response.storedDeviceId ? response.storedDeviceId : '';
    if (response.storedDeviceId && response.storedDeviceId.length > 0) {
      voterDeviceId = id;
    }

    for (let group in response.words) {
      if (response.words[group].Enabled) {
        for (word in response.words[group].Words) {
          debug&&console.log('getWords response, ' + word + ', group: ' + group + ', findWords: ' + response.words[group].FindWords);
          let wordText = response.words[group].Words[word];
          if (wordText) {  // Sept 15, 2019:  Sometimes we get bad data, just skip it
            wordsArray.push({
              word: response.words[group].Words[word].toLowerCase(),
              'regex': globStringToRegex(response.words[group].Words[word]),
              'Color': response.words[group].Color,
              'Fcolor': response.words[group].Fcolor,
              'FindWords': response.words[group].FindWords,
              'ShowInEditableFields': response.words[group].ShowInEditableFields
            });
          }
        }
      }
    }
    debug&&console.log('processed words');
    wordsReceived = true;

    //start the highlight loop
    highlightLoop();
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
    Highlight&&ReadyToFindWords&&findWords()
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
            debug&&console.log('waiting for words');
            start();
        }, 250);
    }
}*/

// <td>
//   <em class="Highlight" style="padding: 1px; box-shadow: rgb(229, 229, 229) 1px 1px; border-radius: 3px; " +
//             "-webkit-print-color-adjust: exact; background-color: rgb(124, 123, 124); " +
//             "color: rgb(255, 255, 255); font-style: inherit;">Kate Gallego</em>
// </td>
function removeAllHighlights () {
  // For some reason when we get here, the dom for the iframe is inaccessible, even though it should be in the same
  // domain.
  // 9/26/19:  Will go with a iframe reload for now

  // let bod = $('body');
  // let ems = $(bod).children().find('em.Highlight');
  var arr = document.getElementsByTagName("EM");
  var fd = document.getElementById("frameDiv");
  let f0 = $('iframe')[0];
  let f0b = $(f0).find(':button');
  let f0e = $(f0).find('em');

  let b2 = $('body').find('em');
  let b3 = $('body').find('em.Highlight');
  let b4 = $('body em');
  let b5 = $('body em.Highlight');
  let buttons = $('body').find(':button');
  console.log($('#weContainer').html());

  $('em.Highlight').each((em) => {
    let text = $(em).text();
    console.log('removeAll: ' + i + ', ' + text);
    $(em).replace(text);
  });
  // ems.replaceWith(ems.innerText);
}


function findWords () {
  if (Object.keys(wordsArray).length > 0) {
    Highlight=false;

    setTimeout(function () {
      /*debug&&*/console.log('finding words',window.location);

      ReadyToFindWords=false;

      var changed = false;
      var myHilitor = new Hilitor();
      var highlights = myHilitor.apply(wordsArray, printHighlights);
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
          let word = highlightMarkers[i].word;
          if (!uniqueNameMatches.includes(word)) {
            uniqueNameMatches.push(word);
          }
        }

        chrome.runtime.sendMessage({
          command: 'showHighlightsCount',
          label: highlights.numberOfHighlights.toString(),
          uniqueNames: uniqueNameMatches,
          altColor: '',
        }, function (response) {
          let lastError = chrome.runtime.lastError;
          if (lastError) {
            console.warn(' chrome.runtime.sendMessage("showHighlightsCount")',lastError.message);
          }
        });
      }
      //setTimeout(function () {
      ReadyToFindWords = true;
      //}, HighligthCooldown);
    }, HighlightWarmup);
  }
  // This next log line floods the log, and slow things down
  // debug&&console.log('finished finding words');

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
