// Original JavaScript code by Chirp Internet: www.chirp.com.au
// Please acknowledge use of this code by including this header.

// modified to :
//  - accept an array of words, phrases
//  - return the amount of matches found

// modified by WeVote to:
//  - stop the recursive search for words at the id weContainer (our menus)
//  - stop at the id noDisplayPageBeforeFraming (the original dom, that becomes dormant and invisible, with a fresh copy in the new iframe)

/* global $ */

function Hilitor (id, tag) {

  let debugH = false;
  var colorIdx = 0;
  var colors = ['#ff6', '#a0ffff', '#9f9', '#f99', '#f6f'];
  var highlightMarkers = {};
  var highlights = {}; //added
  var hiliteClassname = 'Highlight';
  var hiliteTag = tag || 'EM';
  var matchRegex = '';
  var matchRegexEditable = '';
  var numberOfHighlights = 0; //added
  var openLeft = false;
  var openRight = false;
  var skipClasses = new RegExp('(ui-datepicker)','gi');
  var skipTags = new RegExp('^(?:SCRIPT|HEAD|NOSCRIPT|STYLE|TEXTAREA)$');
  var targetNode = document.body;
  var wordColor = [];
  const urlToQuery = $('input[name="pdfFileName"]').val();  // This is for PDFs that have been converted to HTML
  const isFromPDF = (urlToQuery && urlToQuery.length > 0);

  this.setMatchType = function (type) {
    switch (type) {
      case 'left':
        this.openLeft = false;
        this.openRight = true;
        break;
      case 'right':
        this.openLeft = true;
        this.openRight = false;
        break;
      case 'open':
        this.openLeft = this.openRight = true;
        break;
      default:
        this.openLeft = this.openRight = false;
    }
  };

  this.setRegex = function (input) {
    var words = '';
    var wordparts = '';
    var wordsEditable = '';
    var wordpartsEditable = '';
    var wordsList = [];
    var wordpartsList = [];


    //reverse sort the keys based on length
    var sortedKeys = input.sort(function (a, b) {
      return b.word.length - a.word.length;
    });

    // --------------------------
    // console.log('duped sortedKeys.length ' + sortedKeys.length);

    debugH && console.log('duped sortedKeys.length ' + sortedKeys.length);

    let names = [];
    for (let i = 0; i < sortedKeys.length; i++) {
      const name = sortedKeys[i].word;
      if (name === 'tamara sawyer' || name === 'tami sawyer') {
        debugH && console.log('hilitor  ' + i + ': ' + sortedKeys[i].word);
      }
      if (names.includes(name)) {
        debugH && console.log('Skipping duplicate hilitor name ' + name + ', insert = ' + i);
      } else {
        names.push(name);
      }
    }
    debugH && console.log('deduped name list size ' + names.length);



    // --------------------------

    input.map(function (x){return x.word});

    for (let word in sortedKeys) {
      if (sortedKeys[word].FindWords) {
        words += sortedKeys[word].regex + '|';
        if (sortedKeys[word].ShowInEditableFields) {
          wordsEditable += sortedKeys[word].regex + '|';
        }
      }
      else {
        wordparts += sortedKeys[word].regex + '|';
        if (sortedKeys[word].ShowInEditableFields) {
          wordpartsEditable += sortedKeys[word].regex + '|';
        }
      }

    }
    //regex for all words
    var re = '';
    if (words.length > 1) {
      words = words.substring(0, words.length - 1);
      re += '(' + words + ')';
      if (!this.openLeft && !this.openRight) {
        re = '\\b' + re + '\\b' + '|\\s' + re + '\\s';
      }

    }
    if (wordparts.length > 1 && words.length > 1) {
      re += '|';
    }
    if (wordparts.length > 1) {
      wordparts = wordparts.substring(0, wordparts.length - 1);
      re += '(' + wordparts + ')';
    }
    matchRegex = new RegExp(re, 'i');

    debugH && console.log(matchRegex);

    //ContentEditable regex
    re = '';
    if (wordsEditable.length > 1) {
      wordsEditable = wordsEditable.substring(0, wordsEditable.length - 1);
      re += '(' + wordsEditable + ')';
      if (!this.openLeft && !this.openRight) {
        re = '\\b' + re + '\\b' + '|\\s' + re + '\\s';
      }
    }

    if (wordpartsEditable.length > 1 && wordsEditable.length > 1) {
      re += '|';
    }

    if (wordpartsEditable.length > 1) {
      wordpartsEditable = wordpartsEditable.substring(0, wordpartsEditable.length - 1);
      re += '(' + wordpartsEditable + ')';
    }
    matchRegexEditable = new RegExp(re, 'i');
    debugH && console.log('matchRegexEditable', matchRegexEditable);
  };


  // recursively apply word highlighting
  // eslint-disable-next-line complexity
  this.hiliteWords = function (node, printHighlights, inContentEditable) {

    if (node == undefined || !node) {return;}
    if (!matchRegex) {return;}

    // Begin modification for WeVote
    // Before change this was...  if (skipTags.test(node.nodeName)||skipClasses.test(node.className)) {return;}
    if (skipTags.test(node.nodeName) ||
      skipClasses.test(node.className) ||
      node.id === 'u2i-id-1' ||                         // jQuery UI Dialogs
      node.id === 'noDisplayPageBeforeFraming' ||
      node.id === 'sideArea' ||
      node.id === 'wediv' ||
      node.id === 'topMenu') {
      debugH && console.log('<><><><><>hiliteWords early recursive STOP return node.id: ' + node.id);
      return;
    }
    // if (node.id === 'frame') {
    //   console.log('node.id === frame, src: ', node.src);
    // }
    // if (node.id === '' && node.tagName !== 'BODY') {
    //   console.log('node.id === "", tag:', node.tagName, ', textContent: ', node.textContent);
    // }
    // if (node.tagName === 'BODY') {
    //   console.log('node.id === "", tag: "BODY" 2');
    // }

    debugH && console.log('hiliteWords early recursive CONTINUE node.id: ' + node.id);
    // console.log('before iterating Through every child node using highlight words cnt: ' + (node.hasChildNodes() ? node.childNodes.length : 0));
    // End of modification for WeVote

    if (node.hasChildNodes()) {
      for (var i = 0; i < node.childNodes.length; i++) {
        this.hiliteWords(node.childNodes[i], printHighlights, inContentEditable || node.isContentEditable)
      }
    }

    if (node.nodeType == 3) { // NODE_TEXT

      let nv = this.cleanName(node.nodeValue);
      debugH && console.log('cleanName(node.nodeValue) >' + nv +'<');
      if(inContentEditable) {
        regs = matchRegexEditable.exec(nv);
      } else {
        regs = matchRegex.exec(nv);
        if (regs) {
          debugH && console.log('regs response', regs);
        }
      }
      if (regs) {
        var wordfound = '';

        //find back the word
        for (word in wordColor) {
          var pattern = new RegExp(wordColor[word].regex, 'i');
          if (pattern.test(regs[0]) && word.length > wordfound.length) {
            wordfound = word;
            debugH && console.log('hilitor word found: ' + word)
            break;
          }
        }

        if (wordColor[wordfound] != undefined) {
          let urlHref = '';  //WeVote

          if ((node.parentElement.tagName == hiliteTag && node.parentElement.className == hiliteClassname)) {
            //skip highlighting
          }
          else {
            var match = document.createElement(hiliteTag);
            match.className = hiliteClassname;
            match.appendChild(document.createTextNode(regs[0]));
            if (printHighlights) {
              match.style = 'padding: 1px;box-shadow: 1px 1px #e5e5e5;border-radius: 3px;-webkit-print-color-adjust:exact;';
            }
            else {
              match.style = 'padding: 1px;box-shadow: 1px 1px #e5e5e5;border-radius: 3px;';
            }

            if (wordColor[wordfound].Color) {
              match.style.backgroundColor = wordColor[wordfound].Color;
            }
            if (wordColor[wordfound].Fcolor) {
              match.style.color = wordColor[wordfound].Fcolor;
            }

            match.style.fontStyle = 'inherit';

            if (!inContentEditable || (inContentEditable && wordColor[wordfound].ShowInEditableFields)) {
              var after = node.splitText(regs.index);
              after.nodeValue = after.nodeValue.substring(regs[0].length);

              node.parentNode.insertBefore(match, after);
              // Begin modification for WeVote
              urlHref = this.weVoteDomMods(node, match, wordfound);
              // End of modification for WeVote
            }
          }

          var nodeAttributes = this.findNodeAttributes(node.parentElement, {
            'offset': 0,
            'isInHidden': false
          });

          debugH && console.log('WORD FOUND IN DOM: ', wordColor[wordfound].word);
          highlightMarkers[numberOfHighlights] = {
            'word': wordColor[wordfound].word,
            'offset': nodeAttributes.offset,
            'hidden': nodeAttributes.isInHidden,
            'color': wordColor[wordfound].Color,
            'href': urlHref.length ? encodeURI(urlHref) : '',
          };

          numberOfHighlights += 1;
          highlights[wordfound] = highlights[wordfound] + 1 || 1;
        }
      }
    }
  };

  this.weVoteDomMods = function (node, match, wordfound) {
    const possibleA = node.parentNode;
    let candidateHomePage = '';
    // eslint-disable-next-line no-nested-ternary
    let urlHref = (possibleA.href) ? possibleA.href : (possibleA.title ? possibleA.title : '');  // The parent might have been an 'a' before we swapped it out for a span, but if it has an href, use it.
    candidateHomePage = encodeURIComponent(urlHref);
    // If the name is in a link tag, disable it by changing the "A" to a "SPAN"
    if (possibleA.localName === 'a') {   // Only swap it one time, ie. don't swap it if it has the class "once was an A tag"
      $(possibleA).replaceWith(function () {
        return '<span class="once was an A tag" title="' + urlHref + '">' + $(possibleA).text() + '</span>'
      });
    }
    const emNode = node.nextElementSibling;
    if (emNode.tagName === 'EM') {
      const cleanedName = this.cleanName(emNode.innerText);
      const nameLC = cleanedName.toLowerCase();
      urlsForHighlights[nameLC] = emNode.baseURI;
      const {namesToIds} = window;
      const candidateId = namesToIds && namesToIds[nameLC] ? namesToIds[nameLC] : '';
      const encodedName = encodeURIComponent(cleanedName);
      let id = '';

      if (!cleanedName) {
        console.warn('Bad cleaned name error');
      }
      for (let i = 0; i < cleanedName.length; i++) {
        let char1 = cleanedName.charAt(i);
        let cc = char1.charCodeAt(0);
        if ((cc > 47 && cc < 58) || (cc > 64 && cc < 91) || (cc > 96 && cc < 123)) {
          id += char1;
        }
      }
      const frameUrl = candidateExtensionWebAppURL + '?candidate_name=' + encodedName +
        '&candidate_we_vote_id=' + candidateId +
        '&endorsement_page_url=' + encodeURIComponent(location.href) +
        '&candidate_specific_endorsement_url=' + candidateHomePage +
        '&voter_guide_possibility_id=' + weContentState.voterGuidePossibilityId;
      // console.log('frameUrl ==================== ' + frameUrl);
      const clickIFrame = 'setModal(true, \'' + frameUrl + '\', \'' + id + '\', event)';

      $(emNode).wrap('<button type="button" id="' + id + '" class="endorsementHighlights" onclick="' + clickIFrame + '"></button>');
      // Icon within highlights in the DOM of the endorsement page
      if (wordColor[wordfound].Icon.length) {
        $(match).prepend(wordColor[wordfound].Icon);
      }
    }
    return urlHref;
  };

  this.cleanName = function (rawName) {
    let workingCopy = rawName;

    if (isFromPDF && (typeof workingCopy === 'string' || workingCopy instanceof String)) {
      // Remove new lines and form feeds
      workingCopy = workingCopy.replace(/[\n\f]/g, '');
      // Remove following text in parenthesis, if the first char in the string is not am opening parenthesis
      if (workingCopy.charAt(0) !== '(') {
        workingCopy = workingCopy.replace(/(\(.*?\))/g, '');
      }

      const parts = workingCopy.split(':');
      if (parts.length > 1) {
        workingCopy = parts[1];
      }

      return workingCopy.trim();
    }
    return rawName;
  };

  this.findNodeAttributes = function (inNode, attributes) {

    attributes.offset += inNode.offsetTop;
    if (inNode.hidden || inNode.getAttribute('aria-hidden')) {
      attributes.isInHidden = true;
    }
    if (inNode.offsetParent) {
      return this.findNodeAttributes(inNode.offsetParent, attributes);

    }
    return attributes;
  };

  // remove highlighting
  this.remove = function () {
    var arr = document.getElementsByTagName(hiliteTag);
    while (arr.length && (el = arr[0])) {
      var parent = el.parentNode;
      parent.replaceChild(el.firstChild, el);
      parent.normalize();
    }
  };

  // start highlighting at target node
  this.apply = function (input, printHighlights) {
    wordColor = input;
    numberOfHighlights = 0;
    if (input == undefined || !input) {return;}

    this.setRegex(input);


    this.hiliteWords(targetNode, printHighlights, false);
    return {numberOfHighlights: numberOfHighlights, details: highlights, markers: highlightMarkers};
  };

}
