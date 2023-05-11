// Original JavaScript code by Chirp Internet: www.chirp.com.au
// Please acknowledge use of this code by including this header.

// modified to :
//  - accept an array of words, phrases
//  - return the amount of matches found

// modified by WeVote to:
//  - stop the recursive search for words at the id weContainer (our menus)
//  - stop at the id noDisplayPageBeforeFraming (the original dom, that becomes dormant and invisible, with a fresh copy in the new iframe)

/* global $, addHighlightOnClick, addCandidateExtensionWebAppURL, candidateExtensionWebAppURL */

// eslint-disable-next-line no-unused-vars
function Hilitor (id, tag) {
  // var colorIdx = 0;
  // var colors = ['#ff6', '#a0ffff', '#9f9', '#f99', '#f6f'];
  var highlightMarkers = {};
  var highlights = {}; //added
  var hiliteClassname = 'Highlight';
  var hiliteTag = tag || 'EM';
  var matchRegex = '';
  var matchRegexEditable = '';
  let names = [];
  var numberOfHighlights = 0; //added
  // var openLeft = false;
  // var openRight = false;
  var skipClasses = new RegExp('(ui-datepicker)','gi');
  var skipTags = new RegExp('^(?:SCRIPT|HEAD|NOSCRIPT|STYLE|TEXTAREA)$');
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
      // case 'open':
      //   this.openLeft = this.openRight = true;
      //   break;
      // default:
      //   this.openLeft = this.openRight = false;
    }
  };

  this.setRegex = function (input) {
    var wordsEditable = '';
    var wordpartsEditable = '';
    // var wordsList = [];
    // var wordpartsList = [];


    //reverse sort the keys based on length
    var sortedKeys = input.sort(function (a, b) {
      return b.word.length - a.word.length;
    });

    // --------------------------
    // debugHilitor('duped sortedKeys.length ' + sortedKeys.length);

    console.log('hilitor -- duped sortedKeys.length ' + sortedKeys.length);

    for (let i = 0; i < sortedKeys.length; i++) {
      const name = sortedKeys[i].word;
      if (name === 'tamara sawyer' || name === 'tami sawyer') {
        debugHilitor('hilitor  ' + i + ': ' + sortedKeys[i].word);
      }
      if (names.includes(name)) {
        debugHilitor('Skipping duplicate hilitor name ' + name + ', insert = ' + i);
      } else {
        names.push(name);
      }
    }
    debugHilitor('deduped name list size ' + names.length);

    // //regex for all words
    // var re = '';
    // if (words.length > 1) {
    //   words = words.substring(0, words.length - 1);
    //   re += '(' + words + ')';
    //   if (!this.openLeft && !this.openRight) {
    //     re = '\\b' + re + '\\b' + '|\\s' + re + '\\s';
    //   }
    // }
    // if (wordparts.length > 1 && words.length > 1) {
    //   re += '|';
    // }
    // if (wordparts.length > 1) {
    //   wordparts = wordparts.substring(0, wordparts.length - 1);
    //   re += '(' + wordparts + ')';
    // }
    // matchRegex = new RegExp(re, 'i');

    // debugHilitor('matchRegex: ' + matchRegex);

    //ContentEditable regex
    input.map(function (x){return x.word;});

    for (let word in sortedKeys) {
      if (sortedKeys[word].FindWords) {
        // words += sortedKeys[word].regex + '|';
        if (sortedKeys[word].ShowInEditableFields) {
          wordsEditable += sortedKeys[word].regex + '|';
        }
      }
      else {
        // wordparts += sortedKeys[word].regex + '|';
        if (sortedKeys[word].ShowInEditableFields) {
          wordpartsEditable += sortedKeys[word].regex + '|';
        }
      }
    }
    re = '';
    if (wordsEditable.length > 1) {
      wordsEditable = wordsEditable.substring(0, wordsEditable.length - 1);
      re += '(' + wordsEditable + ')';
      if (!this.openLeft && !this.openRight) {
        re = '\\b' + re + '\\b|\\s' + re + '\\s';
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
    debugHilitor('matchRegexEditable', matchRegexEditable);
  };


  // recursively apply word highlighting
  // eslint-disable-next-line complexity
  this.hiliteWords = function (node, printHighlights, inContentEditable) {
    debugHilitor('entry to hiliteWords');
    const hiliteWordsDebug = false;
    if (node == undefined || !node) {return;}
    // if (!matchRegex) {return;}

    // Begin modification for WeVote
    // Before change this was...  if (skipTags.test(node.nodeName)||skipClasses.test(node.className)) {return;}
    if (skipTags.test(node.nodeName) ||
      skipClasses.test(node.className) ||
      node.id === 'u2i-id-1' ||                         // jQuery UI Dialogs
      node.id === 'noDisplayPageBeforeFraming' ||
      node.id === 'sideArea' ||
      node.id === 'wediv' ||
      node.id === 'topMenu') {
      debugHilitor('<><><><><>hiliteWords early recursive STOP return node.id: ' + node.id);
      return;
    }

    debugHilitor('hiliteWords early recursive CONTINUE node.id: ' + node.id);
    // debugHilitor('before iterating Through every child node using highlight words cnt: ' + (node.hasChildNodes() ? node.childNodes.length : 0));
    // End of modification for WeVote

    if (node.hasChildNodes()) {
      for (var i = 0; i < node.childNodes.length; i++) {
        this.hiliteWords(node.childNodes[i], printHighlights, inContentEditable || node.isContentEditable);
      }
    }

    if (node.nodeType == 3) { // NODE_TEXT
      let regs = undefined;
      let nv = this.cleanName(node.nodeValue);
      if (nv.trim().length > 3) {
        debugHilitor('cleanName(node.nodeValue) >' + nv + '<');
        if (nv.includes('Dana')) {
          console.log('dana');
        }
      }
      const t1 = performance.now(); // eslint-disable-line no-unused-vars
      if (nv.length > 3) {
        if(inContentEditable) {
          debugHilitor('matchRegexEditable.exec(nv) 1');
          regs = matchRegexEditable.exec(nv);
        } else {
          // build a mini-regex as a first step toward eliminating gigantic regexes
          let namesString = '';
          const nvLower = nv.toLowerCase().trim();
          // console.log('miniRe raw names string nvLower: \'' + nvLower + '\'');
          for (let i = 0; i < names.length; i++) {
            if (nvLower.includes(names[i].toLowerCase())) {
              namesString += names[i] + '|';
            }
          }
          namesString = namesString.slice(0, -1);  // remove trailing |
          const miniRe = '(\\b' + namesString + '\\b|\\s' + namesString + '\\s)';
          debugHilitor('miniRe: ', miniRe);
          matchRegex = new RegExp(miniRe, 'i');
          regs = matchRegex.exec(nv);
          if (regs) {
            hiliteWordsDebug && debugHilitor('regs response', regs);
          }
        }
      }
      const t2 = performance.now();  // eslint-disable-line no-unused-vars
      // timingFgLog(t1, t2, 'in hilitor.js, exec`ing the regex took', 8.0);
      if (regs) {
        var wordfound = '';

        //find back the word
        for (word in wordColor) {
          var pattern = new RegExp(wordColor[word].regex, 'i');
          if (pattern.test(regs[0]) && word.length > wordfound.length) {
            wordfound = word;
            debugHilitor('hilitor word found: ' + word);
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

          debugHilitor('WORD FOUND IN DOM: ', wordColor[wordfound].word);
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

  this.weVoteDomMods = async function (node, match, wordfound) {
    const  urlHref = node.href;
    const candidateHomePage = encodeURIComponent(urlHref);
    // 5/8/23: Disabling a links caused too much trouble to be worth it
    // const possibleA = node.parentNode;
    // if($(possibleA).text().includes('Michael Bennet')) {
    //   console.log('--------------- $(possibleA).text(): ', $(possibleA).text());
    // }
    // let candidateHomePage = '';
    // // eslint-disable-next-line no-nested-ternary
    // let urlHref = (possibleA.href) ? possibleA.href : (possibleA.title ? possibleA.title : '');  // The parent might have been an 'a' before we swapped it out for a span, but if it has an href, use it.
    // candidateHomePage = encodeURIComponent(urlHref);
    // // If the name is in a link tag, disable it by changing the "A" to a "SPAN"
    // if (possibleA.localName === 'a') {   // Only swap it one time, ie. don't swap it if it has the class "once was an A tag"
    //   let newSpan = document.createElement('span', { class: 'once was an A tag', title: urlHref });
    //   const newContent = document.createTextNode(possibleA.innerText);
    //   newSpan.appendChild(newContent);
    //   possibleA.replaceChild(newSpan, possibleA.childNodes[0]);
    //
    //   // $(possibleA).replaceWith(function () {
    //   //   return '<span class="once was an A tag" title="' + urlHref + '">' + $(possibleA).text() + '</span>';
    //   // });
    // }
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
        console.log('Bad cleaned name error');
      }
      for (let i = 0; i < cleanedName.length; i++) {
        let char1 = cleanedName.charAt(i);
        let cc = char1.charCodeAt(0);
        if ((cc > 47 && cc < 58) || (cc > 64 && cc < 91) || (cc > 96 && cc < 123)) {
          id += char1;
        }
      }
      const state = await getGlobalState();
      const { voterGuidePossibilityId } = state;

      const jQueryEmNode = $(emNode);
      if (wordColor[wordfound].Icon.length) {
        $(match).prepend(wordColor[wordfound].Icon);
      }
      jQueryEmNode.wrap('<button type="button" id="' + id + '" class="endorsementHighlights"></button>');
      const createNew = wordColor[wordfound].Color === '#ff6';         // If yellow highlight

      const frameUrl = createNew ? addCandidateExtensionWebAppURL : candidateExtensionWebAppURL + '?candidate_name=' + encodedName +
        '&candidate_we_vote_id=' + candidateId +
        '&endorsement_page_url=' + encodeURIComponent(location.href) +
        '&candidate_specific_endorsement_url=' + candidateHomePage +
        '&voter_guide_possibility_id=' + voterGuidePossibilityId;

      addHighlightOnClick(id, frameUrl, jQueryEmNode);
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

    let targetNode = document.body;
    try {
      const iFrameBody = $('#frame').contents().find('body')[0];
      if (iFrameBody) {
        targetNode = $('#frame').contents().find('body')[0]; // .contents();
      }
    } catch (e) { /* empty */ }

    this.hiliteWords(targetNode, printHighlights, false);
    return {numberOfHighlights: numberOfHighlights, details: highlights, markers: highlightMarkers};
  };
}
