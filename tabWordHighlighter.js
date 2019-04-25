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
}
var markerCurrentPosition = -1;
var markerPositions = [];
var highlightMarkers = {};
var markerScroll = false;
var printHighlights = true;

var debug = false;

// https://projects.sfchronicle.com/2018/voter-guide/endorsements-list/

if(window.location == window.parent.location){
  //only listen for messages in the main page, not in iframes
  chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
      /* debug && */ console.log("got a message", request);
      if (request.command === "openWeDialog") {
        try {
          // https://codepen.io/markconroy/pen/rZoNbm
          let hr = window.location.href;
          let topMenuHeight = 75;
          let sideAreaWidth = 400;
          let iFrameHeight = window.innerHeight - topMenuHeight;
          let iFrameWidth = window.innerWidth - sideAreaWidth;
          let bod = $('body');
          $(bod).children().wrapAll("<div id='we-trash' >").hide();  // if you remove it, other js goes nuts
          $(bod).children().wrapAll("<div id='weContainer' >");  // Ends up before we-trash
          $('#we-trash').insertAfter('#weContainer');

          let weContainer = $('#weContainer');
          $(weContainer).append("" +
            "<span id='topMenu'>" +
              "<img id='orgLogo' src='https://www.sierraclub.org/sites/www.sierraclub.org/themes/pt/images/logos/sc-logo-green.svg'>" +
              "<b>Sierra Club</b>" +
              "<input type=\"text\" id='email' name='email' placeholder='Email' >" +
              "<input type=\"text\" id='topComment' name='topComment' placeholder='Comment here...' >" +
            "</span>").append("<div id='weFlexGrid' ></div>");

          let weFlexGrid = $('#weFlexGrid');
          $(weFlexGrid).append('<aside id="frameDiv"><iframe id="frame" width=' + iFrameWidth + ' height=' + iFrameHeight + '></iframe></aside>');
          $(weFlexGrid).append('<section id="sideArea"></section>');

          $("#frame").attr("src", hr);

          let noCandiatesFromServerYet = [];
          candidatePanel( noCandiatesFromServerYet, $("#sideArea"));

        } catch(err) {
          console.log("jQuery dialog in tabWordHighligher threw: ", err);
        }
        return false;
      } else {
        if (sender.id == "abcibokldhgkclhihipipbiaednfcpia" || sender.id == "fgmbnmjmbjenlhbefngfibmjkpbcljaj" || sender.id == "highlightthis@deboel.eu") {
          if (request.command == "ScrollHighlight") {
            jumpNext();
            showMarkers();
            return false
          }
          if (request.command == "getMarkers") {
            sendResponse(highlightMarkers);
            return true;
          }
          if (request.command == "ClearHighlights") {
            highlightMarkers = {};
            return false;

          }
          if (request.command == "ReHighlight") {
            let testWords = request.words;
            testWords.push("Dianne")
            reHighlight(request.words);
            return false;

          }
        }
      }
      return true;
    }

  );
}
else {
  debug&&console.log("not in main page",window.location)
}

function jumpNext() {
  if (markerCurrentPosition == markerPositions.length - 1 || markerCurrentPosition > markerPositions.length - 1) {
    markerCurrentPosition = -1;
  }
  markerCurrentPosition += 1;
  $(window).scrollTop(markerPositions[markerCurrentPosition] - (window.innerHeight / 2));
  //document.body.scrollTop=markerPositions[markerCurrentPosition]-(window.innerHeight/2);
}

function showMarkers() {
  console.log("Steve, background showMarkers");
  var element = document.getElementById('HighlightThisMarkers');
  if (element) {
    element.parentNode.removeChild(element);
  }

  var containerElement = document.createElement("DIV");
  containerElement.id = "HighlightThisMarkers";

  for (marker in highlightMarkers) {
    var span = document.createElement("SPAN");
    span.className = "highlightThisMarker";
    span.style.backgroundColor = highlightMarkers[marker].color;
    var markerposition = document.body.scrollTop + (highlightMarkers[marker].offset / document.body.clientHeight) * window.innerHeight;
    span.style.top = markerposition + "px";
    containerElement.appendChild(span);
  }
  document.body.appendChild(containerElement);
  if (!markerScroll) {
    document.addEventListener("scroll", function () {
      showMarkers();
    });
    markerScroll = true;
  }
}

function reHighlight(words) {
  for (group in words) {
    if (words[group].Enabled) {
      for (word in words[group].Words) {
        wordsArray.push( {
          word: words[group].Words[word].toLowerCase(),
          "regex": globStringToRegex(words[group].Words[word]),
          "Color": words[group].Color,
          "Fcolor": words[group].Fcolor,
          "FindWords": words[group].FindWords,
          "ShowInEditableFields": words[group].ShowInEditableFields
        });
      }
    }
  }
  findWords();
}


chrome.runtime.sendMessage({command: "getStatus"}, function (response) {
  debug&&console.log('reponse from getStatus',window.location);
  highlighterEnabled = response.status;
  printHighlights = response.printHighlights;
  if (highlighterEnabled) {
    debug&&console.log('about to get words',window.location);

    chrome.runtime.sendMessage({
      command: "getWords",
      url: location.href.replace(location.protocol + "//", "")
    }, function (response) {
      debug&&console.log('got words');

      for (group in response.words) {
        if (response.words[group].Enabled) {
          for (word in response.words[group].Words) {
            wordsArray.push({
              word: response.words[group].Words[word].toLowerCase(),
              "regex": globStringToRegex(response.words[group].Words[word]),
              "Color": response.words[group].Color,
              "Fcolor": response.words[group].Fcolor,
              "FindWords": response.words[group].FindWords,
              "ShowInEditableFields": response.words[group].ShowInEditableFields
            });
          }
        }
      }
      debug&&console.log('processed words');
      wordsReceived = true;

      //start the highlight loop
      highlightLoop();
    });

  }
});

$(document).ready(function () {
  Highlight=true;

  debug && console.log('setup binding of dom sub tree modification');
  $("body").bind("DOMSubtreeModified", function () {
    //debug && console.log("dom sub tree modified");
    Highlight=true;
  });
});


function highlightLoop(){

  ReadyToFindWords = true;

  HighlightLoop = setInterval(function () {
    Highlight&&ReadyToFindWords&&findWords()
  }, HighlightLoopFrequency);

}


function getSearchKeyword() {
  var searchKeyword = null;
  if (document.referrer) {
    for (searchEngine in searchEngines) {
      if (document.referrer.indexOf(searchEngine)) {
        searchKeyword = getSearchParameter(searchEngines[searchEngine]);
      }
    }
  }
  return searchKeyword;
}
function getSearchParameter(n) {
  var half = document.referrer.split(n + '=')[1];
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


function findWords() {
  if (Object.keys(wordsArray).length > 0) {
    Highlight=false;

    setTimeout(function () {
      debug&&console.log('finding words',window.location);

      ReadyToFindWords=false;
           
      var changed = false;
      var myHilitor = new Hilitor();
      var highlights = myHilitor.apply(wordsArray, printHighlights);
      if (highlights.numberOfHighlights > 0) {
        highlightMarkers = highlights.markers;
        markerPositions = [];
        for (marker in highlightMarkers) {
          if (markerPositions.indexOf(highlightMarkers[marker].offset) == -1) {
            markerPositions.push(highlightMarkers[marker].offset);
          }
        }
        markerPositions.sort();


        chrome.runtime.sendMessage({
          command: "showHighlights",
          label: highlights.numberOfHighlights.toString()
        }, function (response) {
        });
      }
      //setTimeout(function () {
      ReadyToFindWords = true;
      //}, HighligthCooldown);
    }, HighlightWarmup);
  }
  debug&&console.log('finished finding words');

}


function globStringToRegex(str) {
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