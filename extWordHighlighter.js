/* global defaultNeverHighlightOn */

const { chrome: { runtime: { getPlatformInfo}, contextMenus: { create, removeAll } } } = window;

/* eslint init-declarations: 0 */
/* eslint multiline-ternary: 0 */
/* eslint no-empty-function: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-mixed-operators: 0 */
/* eslint no-redeclare: 0 */
/* eslint no-ternary: 0 */
/* eslint no-undef: 0 */
/* eslint no-unused-vars: 0 */
/* eslint complexity: 0 */

const debugE = false;
let HighlightsData = {};
let activeTabIdGlobal = -1;
let activeUrlGlobal = '';
let activeWindowId =  -1;
let aliasNames = [];
let createSearchMenuT0 = 0;
let highlighterEnabled = false;   // This is changed from popup.js
let nameToIdMap = {};
let noContextMenu = ['_generated_background_page.html'];
let printHighlights = true;
let showFoundWords = false;
let tabsHighlighted = {};
let uniqueNames = [];

const tabInfoObj = {
  email: '',
  encodedHref: '',
  highlighterEnabled,           // Non authoritative copy, this can get stale
  neverHighlightOn: [],         // Non authoritative copy, but will super rarely be stale, only would effect performance a bit
  noExactMatchOrgList: {},
  orgLogo: '',
  orgName: '',
  orgWebsite: '',
  possibilityUrl: '',
  showEditor: false,
  showHighlights: false,
  tabId: -1,
  twitterHandle: '',
  url: null,
  voterGuidePossibilityId: -1,
  weVoteId: '',
};

$(() => {
  console.log('extWordHighlighter constructor');
});

function getWordsInGroup (groupName, highlightsList) {
  // eslint-disable-next-line prefer-destructuring
  const display = groupName.split('_')[0];
  let stance = groupName.split('_')[1] ? groupName.split('_')[1] : '';
  if (stance === 'INFO') {
    stance = 'NO_STANCE';
  }
  let wordList = [];

  for (let i = 0; i < highlightsList.length; i++) {
    let highlight = highlightsList[i];
    if (stance.length === 0) {
      if (highlight.display === display) {
        wordList.push(highlight.name);
      }
    } else {
      if (highlight.display === display && highlight.stance === stance) {
        wordList.push(highlight.name);
      }
    }
  }
  return wordList;
}

// Unfortunately aliases all are sent by the server as DEFAULTS, fix the data here
function promoteAliasesThatArriveAsDefault (highlightsList) {
  aliasNames = [];
  nameToIdMap = {};
  for (let i = 0; i < highlightsList.length; i++) {
    let highlight = highlightsList[i];
    const {display, we_vote_id: weVoteId, name} = highlight;
    if (name && name.length > 2) {
      nameToIdMap[name.toLowerCase()] = weVoteId;
      if (display === 'DEFAULT') {
        let match = highlightsList.find(function (possibleAlias) {
          return possibleAlias.we_vote_id === weVoteId;
        });

        const {display: displayMatch, stance: stanceMatch} = match;
        if (displayMatch !== 'DEFAULT') {
          console.log('For ' + name + ' overwriting to ' + displayMatch + ', ' + stanceMatch + ', from ', match);
          highlight.display = displayMatch;
          highlight.stance = stanceMatch;
        }
      }
      let match = aliasNames.find((alias) => alias.candidateWeVoteId === weVoteId);
      if (match === undefined) {
        aliasNames.push({
          candidateWeVoteId: weVoteId,
          names: [name],
        });
      } else {
        match.names.push(name);
        debugE && console.log('ALIAS FOUND <<<<<<<<<<<< ' + name + ', ', match);
      }
    } else {
      console.log('Bad hightlight received in promoteAliases ', highlight);
    }
  }
}

function initializeHighlightsData (highlightsList, neverHighLightOnLocal) {
  console.log('START START START initializeHighlightsData');
  promoteAliasesThatArriveAsDefault(highlightsList);

  HighlightsData.Version = '12';
  HighlightsData.neverHighlightOn =  preProcessNeverList(neverHighLightOnLocal);
  neverHighlightOn = HighlightsData.neverHighlightOn;
  // console.log('neverHighLightOn:', HighlightsData.neverHighLightOn);
  // HighlightsData.ShowFoundWords = true;
  HighlightsData.PrintHighlights = true;
  let today = new Date();
  HighlightsData.Donate = today.setDate(today.getDate() + 20);
  HighlightsData.Groups = [];
  for (let groupName in groupNames) {
    let group = {
      'groupName': groupName,
      'Fcolor': getColor(groupName, true),
      'Color': getColor(groupName, false),
      'Icon': getIcon(groupName),
      'ShowInEditableFields': false,
      'Enabled': true,
      'FindWords': true,
      'ShowOn': [],
      'DontShowOn': [],
      'Words': getWordsInGroup(groupName, highlightsList),
      'Type': 'local',
      'Modified': Date.now()
    };
    debugE && console.log('groupName: ' + groupName + ', group: ' + group);
    HighlightsData.Groups.push(groupName, group);
  }

  printHighlights = HighlightsData.PrintHighlights;
  // console.log("END END END initializeHighlightsData");
}

// globStringToRegex doesn't handle '*.wevote.us' well, that pattern will not match 'wevote.us', so this fixup is needed
function preProcessNeverList (neverList) {
  let outList = [];
  for(let i = 0; i < neverList.length; i++) {
    const entry = neverList[i];
    if (entry.startsWith('*.')) {
      outList.push(entry.substring(2));
    }
    outList.push(entry);
  }
  return outList;
}

function getColor (typeStance, foreground) {
  switch (typeStance) {
    case 'POSSIBILITY_SUPPORT':
      return foreground ? colors.POSS_SUPPORT_FOREGROUND : colors.POSS_SUPPORT_BACKGROUND;
    case 'POSSIBILITY_OPPOSE':
      return foreground ? colors.POSS_OPPOSE_FOREGROUND : colors.POSS_OPPOSE_BACKGROUND;
    case 'POSSIBILITY_INFO':
      return foreground ? colors.POSS_INFO_FOREGROUND : colors.POSS_INFO_BACKGROUND;
    case 'STORED_SUPPORT':
      return foreground ? colors.STORED_SUPPORT_FOREGROUND : colors.STORED_SUPPORT_BACKGROUND;
    case 'STORED_OPPOSE':
      return foreground ? colors.STORED_OPPOSE_FOREGROUND : colors.STORED_OPPOSE_BACKGROUND;
    case 'STORED_INFO':
      return foreground ? colors.STORED_INFO_FOREGROUND : colors.STORED_INFO_BACKGROUND;
    case 'DELETED':
      return foreground ? colors.DELETED_FOREGROUND : colors.DELETED_BACKGROUND;
    case 'DEFAULT':
    default:
      return foreground ? '#000' : '#ff6';
  }
}

function getIcon (typeStance) {
  switch (typeStance) {
    case 'POSSIBILITY_SUPPORT':
      return markupForThumbSvg('thumbIconSVGContent', 'endorse', getColor (typeStance, true));
    case 'POSSIBILITY_OPPOSE':
      return markupForThumbSvg('thumbIconSVGContent', 'oppose',  getColor (typeStance, true));
    case 'POSSIBILITY_INFO':
      return '';
    case 'STORED_SUPPORT':
      return markupForThumbSvg('thumbIconSVGContent', 'endorse', getColor (typeStance, true));
    case 'STORED_OPPOSE':
      return markupForThumbSvg('thumbIconSVGContent', 'oppose',  getColor (typeStance, true));
    case 'STORED_INFO':
      return '';
    case 'DELETED':
      return '';
    case 'DEFAULT':
    default:
      return '';
  }
}

function createSearchMenu () {
  /* debugE&& */
  console.log('createSearchMenu has been called');
  getPlatformInfo(
    function () {
      create({
        'title': 'Select a Candidate\'s full name, then try again!',
        'id': 'Highlight'  // Is this causing?:  Unchecked runtime.lastError: Cannot create item with duplicate id Highlight
      });
    }
  );
}

// Timing log appears in the background console, instead of in the popup.js console, which is destroyed when the pop up closes
function popupMenuTiming (time0, time1, text, warnAt) {
  timingLog(time0, time1, text, warnAt);
}

function popupLogger (text) {
  console.log(text);
}

function createNewTabsHighlightedElement (tabId, url) {
  tabsHighlighted[tabId] = { ...tabInfoObj };
  debugE && console.log('^^^^^^^^ createNewTabsHighlightedElement before:', tabId, tabsHighlighted[tabId]);
  Object.assign(tabsHighlighted[tabId], {
    neverHighlightOn: defaultNeverHighlightOn,
    highlighterEnabled,
    tabId,
    url,
  });
  debugE && console.log('^^^^^^^^ createNewTabsHighlightedElement after:', tabId, tabsHighlighted[tabId]);
  return tabsHighlighted[tabId];
}


function updateContextMenu (inUrl){
  debugE && console.log('updating context menu', inUrl);
  if(inUrl&&noContextMenu.indexOf(inUrl) === -1){
    removeAll();
    createSearchMenu();
    let contexts = ['selection'];
    let filteredGroups=getWordsBackground(inUrl);  // Don't show highlights on pages that have been excluded

    let sortedByModified = [];

    for (let group in filteredGroups){
      if(filteredGroups[group].Type !== 'remote'){
        sortedByModified.push([group, filteredGroups[group].Modified]);
      }
    }
    sortedByModified.sort(
      function (a, b) {
        return b[1] - a[1];
      }
    );
    let showGroupsInRightClickMenu = false;  // Sept 17, 2019 Disable the display of groups (adding to groups) in the right click menu

    if (showGroupsInRightClickMenu) {
      let numItems = 0;
      for (let i = 0; i < contexts.length; i++) {
        let context = contexts[i];
        sortedByModified.forEach(function (group) {
          if (numItems === 10) {
            //create a parent menu
            let parentid = create({
              'title': 'More',
              'contexts': [context],
              'id': 'more'
            });
          }
          let title = '+ ' + group[0];
          if (numItems > 9) {
            let id = create({
              'title': title,
              'contexts': [context],
              'id': 'AddTo_' + group[0],
              'parentId': 'more'
            });
          } else {
            let id = create({
              'title': title,
              'contexts': [context],
              'id': 'AddTo_' + group[0]
            });
          }
          numItems += 1;
        });
      }
    }

    let idContextMenuCreateNew = create({
      'title': 'Create We Vote Endorsement',
      'contexts': [contexts[0]],
      'id': 'idContextMenuCreateNew'
    });

    // Feb 6, 2020 -- Removed so that there's a single choice on the right click dialog
    // let idContextMenuRevealRight = create({
    //   'title': 'Reveal in Candidate List',
    //   'contexts': [contexts[0]],
    //   'id': 'idContextMenuRevealRight'
    // });
  }
}

function processUniqueNames (uniqueNamesFromPage) {
  // This function will be called multiple times as the page loads (to catch previously unrendered names), for simple pages this will seem unnecessary
  debugE && console.log('uniqueNamesFromPage: ', uniqueNamesFromPage);
  for (let i = 0; i < uniqueNamesFromPage.length; i++) {
    // eslint-disable-next-line prefer-destructuring
    const name = uniqueNamesFromPage[0];
    if ($.inArray(name, uniqueNames) === -1) {
      uniqueNames.push(name);
      // TODO: add a json fetch of some information
    }
  }
}

// Called by the "highlight this tab" button on the popup
// This receives the tab not the tabid!
function setEnableForActiveTab (showHighlights, showEditor, tab) {
  const { chrome: { tabs: { getAllInWindow, sendMessage, lastError } } } = window;
  debugE && console.log('enabling highlights on active tab ', tab, ', showEditor: ', showEditor, ', showHighlights:', showHighlights);

  let tabID = tab ? tab.id : activeTabIdGlobal;
  if (!tabID) {
    console.error('setEnableForActiveTab received invalid tab object, and activeTabIdGlobal was undefined');
  }

  let tentativeURL = activeUrlGlobal;
  if (tab) {
    tentativeURL = tab.url.length ? tab.url : tab.pendingUrl;
  }

  // Ignore if on a 'neverHighlightOn' page
  if (HighlightsData.neverHighlightOn === undefined) {
    HighlightsData.neverHighlightOn = defaultNeverHighlightOn;
  }
  let neverHighlightOn = HighlightsData.neverHighlightOn;

  for (let neverShowOn in HighlightsData.neverHighlightOn) {
    if (tentativeURL.match(globStringToRegex(HighlightsData.neverHighlightOn[neverShowOn]))) {
      showHighlightsCount('x', 'red', tabID);
      setTimeout(function () {
        showHighlightsCount('', 'white', tabID);
      }, 500);
      return;
    }
  }

  if (showHighlights || showEditor) {
    highlighterEnabled = true;
  }

  if (!tabsHighlighted[tabID]) {
    createNewTabsHighlightedElement(tabID, tentativeURL);
  }

  debugE && console.log('^^^^^^^^ setEnableForActiveTab before:', tabID, tabsHighlighted[tabID]);
  Object.assign(tabsHighlighted[tabID], {
    highlighterEnabled,
    neverHighlightOn,
    showHighlights,
    showEditor,
    url: tentativeURL,
    tabId: tabID
  });

  console.log('sendMessage displayHighlightsForTabAndPossiblyEditPanes tabID:', tabID);
  sendMessage(tabID, {
    command: 'displayHighlightsForTabAndPossiblyEditPanes',
    highlighterEnabled,
    neverHighlightOn,
    showHighlights,
    showEditor,
    url: tentativeURL,
    tabId: tabID,
  }, function (result) {
    if (lastError) {
      console.warn(' chrome.runtime.sendMessage("displayHighlightsForTabAndPossiblyEditPanes")', lastError.message);
    }
    console.log('RESPONSE sendMessage displayHighlightsForTabAndPossiblyEditPanes tabID:',tabID);
    debugE && console.log('on click highlight this tab or edit this tab, response received from displayHighlightsForTabAndPossiblyEditPanes ', result);
  });
}

// Enable or Disable highlights for all tabs.
// Note 1: while debugging this code, make sure the chrome://extensions/ tab is furthest to the right in your browser,
// since otherwise the other tabs will not be in the 'tabs' array.  Having devtools open in the current window can also cause trouble -- just open it as a separate window.
// Note 2:  If you are reloading the extension with the chrome://extensions/, make sure you hard reload every tab in the window before continuing your test or tabs will
// be left in a messed up state, and things won't go well.
function enableHighlightsForAllTabs (showHighlights) {
  const { chrome: { runtime: { lastError }, tabs: { query, sendMessage } } } = window;
  let activeTab = -1;

  let test = localStorage['highlightCandidatesOnAllTabs'];

  query({}, function (tabs) {
    if (activeWindowId < 0) {
      console.warn('enableHighlightsForAllTabs called with a uninitialized activeWindowId, this function will fail');
    }

    for (let i = 0; i < tabs.length; i++) {
      const { active, id: tabId, url, windowId } = tabs[i];
      let skip = false;  // Skip those tabs whose URLs are on the neverHighlightOn list

      if (windowId !== activeWindowId) {
        skip = true;
        break;
      } else {
        for (let neverShowOn in HighlightsData.neverHighlightOn) {
          if (url.match(globStringToRegex(HighlightsData.neverHighlightOn[neverShowOn]))) {
            skip = true;
            break;
          }
        }
      }

      if (url.startsWith('chrome:') || url.startsWith('devtools:')) skip = true;

      if (!skip && tabId > 0) {
        const never = HighlightsData && HighlightsData.neverHighlightOn && HighlightsData.neverHighlightOn.length ?
          HighlightsData.neverHighlightOn : defaultNeverHighlightOn;
        // Create a new default tabInfoObj, if one does not exist
        if (!tabsHighlighted[tabId]) {
          createNewTabsHighlightedElement(tabId, url);
        }

        const showEditor = tabsHighlighted[tabId] && showHighlights && active ? tabsHighlighted[tabId].showEditor : false;
        const { highlighterEnabled } = window;

        console.log('enableHighlightsForAllTabs action showHighlights: ', showHighlights, ', tabId: ', tabId, ', showEditor: ', showEditor,
          ', highlighterEnabled: ', highlighterEnabled, ', url: ', url);

        Object.assign(tabsHighlighted[tabId], {
          highlighterEnabled,
          showHighlights,
          showEditor,
          neverHighlightOn: never,
          url,
          tabId,
        });

        sendMessage(tabId, {     // 5/1/2020: This MUST be chrome.tabs.sendMessage, not chrome.runtime.sendMessage
          command: 'displayHighlightsForTabAndPossiblyEditPanes',
          highlighterEnabled,
          showHighlights,
          showEditor,
          tabId,
          url,
        }, function (result) {
          if (lastError) {
            console.warn(' chrome.runtime.sendMessage("displayHighlightsForTabAndPossiblyEditPanes")', lastError.message);
          }
          debugE && console.log('on click icon, response received to displayHighlightsForTabAndPossiblyEditPanes ', result);
        });
      }
    }
  });
}

function removeHighlightsForAllTabs () {
  const { chrome: { runtime: { lastError }, tabs: { sendMessage } } } = window;

  for (let key in tabsHighlighted) {
    // skip loop if the property is from prototype
    if (!tabsHighlighted.hasOwnProperty(key)) continue;

    const { active, tabId, url } = tabsHighlighted[key];

    if (tabId === undefined || tabId < 0) continue;

    window.highlighterEnabled = false;

    console.log('removeHighlightsForAllTabs action tabId: ', tabId, ', url: ', url);

    Object.assign(tabsHighlighted[tabId], {
      highlighterEnabled: false,
      showHighlights: false,
      showEditor: false,
    });

    let intTabId = parseInt(key, 10);

    sendMessage(intTabId, {     // 5/1/2020: This MUST be chrome.tabs.sendMessage, not chrome.runtime.sendMessage
      command: 'displayHighlightsForTabAndPossiblyEditPanes',
      highlighterEnabled: false,
      showHighlights: false,
      showEditor: false,
      tabId: key,
      url,
    }, function (result) {
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("removeHighlightsForAllTabs")', lastError.message);
      }
      debugE && console.log('on click icon, response received to removeHighlightsForAllTabs ', result);
    });
  }
}


chrome.tabs.onActivated.addListener(function (tabid){
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    debugE && console.log('XXXXXX set GLOBALS in tabs onactivated', tabid, tabs);
    // Sept 25, 2019: Todo this assumes that the first tab, when you turn it on, is the one that gets the menu!
    if (tabs.length) {
      const { 0 : { id, url, windowId } } = tabs;
      activeTabIdGlobal = id;
      activeUrlGlobal = url;
      activeWindowId = windowId;

      debugE && console.log('XXXXXX chrome.tabs.onActivated.addListener', tabs[0]);
      updateContextMenu(tabs[0].url);
    } else {
      console.warn('chrome.tabs.onActivated.addListener found no currentWindow for tabid: ' + tabid);
    }
  });
});

chrome.tabs.onUpdated.addListener(
  function (tabid, tab){
    debugE && console.log('in tabs onupdated', tabid, tab);

    if(tab.url !== undefined){
      updateContextMenu(tab.url);
    }
  }
);
chrome.tabs.onCreated.addListener(function (tab){if(tab.url !== undefined){updateContextMenu(tab.url);}});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  const { chrome: { tabs: { sendMessage, lastError, query } } } = window;
  debugE && console.log('Steve chrome.contextMenus.onClicked: ' + info.selectionText);

  if (info.menuItemId.indexOf('idContextMenuCreateNew') > -1) {
    sendMessage(tab.id, {
      command: 'createEndorsement',
      selection: info.selectionText,
      pageURL: info.pageUrl,
      tabId: tab.id,
    }, function (result) {
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("createEndorsement")', lastError.message);
      }
      debugE && console.log('contextMenus on click, response received to createEndorsement ', result);
    });
  } else if (info.menuItemId.indexOf('idContextMenuRevealRight') > -1) {
    sendMessage(tab.id, {
      command: 'revealRight',
      selection: info.selectionText,
      pageURL: info.pageUrl,
      tabId: tab.id,
    }, function (result) {
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("revealRight")', lastError.message);
      }
      debugE && console.log('contextMenus on click, response received to revealRight ', result);
    });
  } else if (info.menuItemId.indexOf('AddTo_') > -1) {
    groupName = info.menuItemId.replace('AddTo_', '');
    let wordAlreadyAdded = false;

    if (HighlightsData.Groups[groupName].Words.indexOf(info.selectionText) > -1) {
      wordAlreadyAdded = true;
    }
    if (wordAlreadyAdded) {
      chrome.notifications.create('1', {
        'type': 'basic',
        'iconUrl': 'Plugin96.png',
        //"requireInteraction": false,
        'title': 'Highlight This',
        'message': info.selectionText + ' was already assigned to the word list'
      });
      //window.alert(info.selectionText + " was already assigned to the word list");
    } else {
      HighlightsData.Groups[groupName].Words.push(info.selectionText);
      HighlightsData.Groups[groupName].Modified = Date.now();
      chrome.notifications.create('1', {
        'type': 'basic',
        'iconUrl': 'Plugin96.png',
        // "requireInteraction": false,
        'title': 'Added new word',
        'message': info.selectionText + ' has been added to ' + groupName + '.\nRefresh the page to see new highlights.'
      });

      updateContextMenu(tab.url);
    }
  } else if (info.menuItemId === 'Highlight') {
    query({active: true, currentWindow: true}, function (tabs) {
      sendMessage(tabs[0].id, {command: 'ScrollHighlight'});
    });
  //     }
  //     requestReHighlight();
  //   }
  }
});



// chrome.runtime.onInstalled.addListener(function() {
//   console.log("Highlights plugin installed");
//   chrome.alarms.create("Data sync", {"periodInMinutes":30});
// });
//
// chrome.alarms.onAlarm.addListener(function(alarm){
//   if (alarm.name === "Data sync") {
//     syncData();
//   }
// });


chrome.commands.onCommand.addListener(function (command) {
  const {chrome: {tabs: {sendMessage, query}}} = window;
  if (command === 'ScrollHighlight') {
    query({active: true, currentWindow: true}, function (tabs) {
      sendMessage(tabs[0].id, {command: 'ScrollHighlight'});
    });
  }
});

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {    // eslint-disable-line complexity
    debugE && console.log('XXXXXX message received -- ' + request.command + ': ', request, sender, sender.tab.id);
    //request=JSON.parse(evt.data);
    if (request.command === 'getTopMenuData') {
      getOrganizationFound(request.url, sendResponse);
    } else if (request.command === 'getHighlights') {
      getHighlightsListFromApiServer(request.url, request.doReHighlight, sendResponse, '6000');
    } else if (request.command === 'getPositions') {
      getPossiblePositions(request.voterGuidePossibilityId, request.hrefURL, request.isIFrame, sendResponse);
    } else if (request.command === 'savePosition') {
      debugE && console.log('XXXXXX voterGuidePossibilityPositionSave message received', request, request.removePosition, sender, sender.tab.id);
      voterGuidePossibilityPositionSave(
        request.itemName,
        request.voterGuidePossibilityId,
        request.voterGuidePossibilityPositionId,
        request.stance,
        request.statementText,
        request.moreInfoURL.trim(),
        request.removePosition,
        sendResponse);
    } else if(request.command === 'getCandidate') {
      getCandidate (request.candidateWeVoteId, sendResponse);
    } else if(request.command === 'getVoterInfo') {
      getVoterSignInInfo (sendResponse);
    } else if(request.command === 'getWords') {
      if (request.id && request.id.length > 0) {
        localStorage['voterDeviceId'] = request.id;     // Incoming voterDeviceId if we are viewing a wevote domain page.
      }
      sendResponse({
        words:getWordsBackground(request.url),
        storedDeviceId: localStorage['voterDeviceId'],  // Outgoing voterDeviceId for viewing all other pages
        url: request.url,
      });
    } else if (request.command === 'updateVoterGuide') {
      updatePossibleVoterGuide(request.voterGuidePossibilityId, request.orgName, request.orgTwitter, request.orgState,
        request.comments, request.sendResponse);
    } else if (request.command === 'showWordsFound') {
      sendResponse({success:showWordsFound(request.state)});
    } else if (request.command === 'initiateReHighlightFromContext') {
      requestReHighlight();
      sendResponse({success: true,
        status: 'requestReHighlight invoked asynchronously'});
    } else if(request.command === 'showHighlightsCount') {
      showHighlightsCount(request.label, request.altColor, sender.tab.id);
      if (request.altColor.length === 0) {
        processUniqueNames(request.uniqueNames);
      }
      sendResponse({success: 'ok'});
    } else if(request.command === 'voterGuidePossibilitySave') {
      voterGuidePossibilitySave(request.organizationWeVoteId, request.voterGuidePossibilityId, request.internalNotes, request.contributorEmail, sendResponse);

      // The following commands are from "Highlight This", and are not currently in use

    } else if(request.command === 'setPrintHighlights') {
      sendResponse({success:setPrintHighlights(request.state)});
    } else if(request.command === 'addGroup') {
      console.log('XXXXXXXXX NO LONGER CALLED XXXXXXXXXXX addGroup message received', request, sender, sender.tab.id);
      sendResponse({success:addGroup(request.group, request.color, request.fcolor, request.icon, request.findwords, request.showon,
        request.dontshowon, request.words, request.groupType, request.remoteConfig, request.regex, request.showInEditableFields)});
    } else if(request.command === 'removeWord') {
      sendResponse({success:removeWord(request.word)});
    } else if(request.command === 'beep') {
      document.body.innerHTML += '<audio src="beep.wav" autoplay="autoplay"/>';
    } else if(request.command === 'getStatus') {
      // console.log('if(request.command === \'getStatus\') highlighterEnabled: ', highlighterEnabled);
      getThisTabsStatus(request.tabURL, sendResponse);
    } else if(request.command === 'updateContextMenu'){
      updateContextMenu(request.url);
      sendResponse({success: 'ok'});
    } else if(request.command === 'flipGroup') {
      sendResponse({success: flipGroup(request.group, request.action)});
    } else if(request.command === 'deleteGroup') {
      sendResponse({success:deleteGroup(request.group)});
    } else if(request.command === 'addWord') {
      sendResponse({success:addWord(request.word)});
    } else if(request.command === 'addWords') {
      sendResponse({success:addWords(request.words)});
    } else if(request.command === 'syncList') {
      sendResponse({success:syncWordList(HighlightsData.Groups[request.group], true,request.group)});
    } else if(request.command === 'setWords') {
      sendResponse({success:setWords(request.words, request.group, request.color, request.fcolor, request.findwords,
        request.showon, request.dontshowon,  request.newname, request.groupType, request.remoteConfig,request.regex, request.showInEditableFields)});
    } else if (request.command === 'myTabId') {
      // tabId will hold the sender tab's id value
      const tabId = sender.tab.id;
      sendResponse({ from: 'event', tabId });
    } else if (request.command === 'getWeVoteTabs') {
      sendResponse({ from: 'tabs', tabs: getWeVoteTabs() });
    } else if (request.command === 'storeDeviceId') {
      const tabId = sender.tab.id;
      if (request.voterDeviceId.length) {
        localStorage['voterDeviceId'] = request.voterDeviceId;
        console.log('extWordHighlighter "storeDeviceId" received from tab: ' + tabId + ', voterDeviceId: ' + request.voterDevicedId);
      }
      sendResponse({ from: 'event', tabId });
    } else if (request.command === 'closeDialogAndUpdatePositionsPanel') {
      const tabId = sender.tab.id;
      console.log('extWordHighlighter "closeDialogAndUpdatePositionsPanel" received from tab: ' + tabId);
    } else {
      console.error('extWordHighlighter received unknown command : ' + request.command);
    }
    return true;
  });

function getStatusForActiveTab (tabId, url) {
  let status = tabsHighlighted[tabId];
  if (status) {
    if ((status.url === undefined || status.url === '') && url) {
      status.url = url;
    }
    debugE && console.log('getStatusForActiveTab element LOOKUP: ', tabId, url, status);
  } else {
    status = createNewTabsHighlightedElement(tabId, url);
    debugE && console.log('getStatusForActiveTab element CREATION: ', tabId, url, status);
  }
  return status;
}

/**
 * Key data for each tab is stored in the tabsHighlighted object, including whether the tab is enabled, shows highlighting,
 * should display the editor panes, etc.
 * @param {string} tabURL - the href of the tab, as a backup
 * @param {requestCallback} sendResponse - the content side callback
 * @returns {void}
 */
function getThisTabsStatus (tabURL, sendResponse) {
  const {chrome: {tabs: { sendMessage, query } } } = window;
  debugE && console.log('function getThisTabsStatus () {() called for url', tabURL);
  chrome.tabs.query({}, function (tabs) {
    tab = {};
    for (let i = 0; i < tabs.length; i++) {
      // console.log('>>>>>>>>>>>>>>> "' + tabs[i].url )
      if (tabs[i].url === tabURL) {
        tab = tabs[i];
        break;
      }
    }

    let status = {};
    let found = false;
    if (tab !== {}) {
    // if (Object.keys(tab).length > 0) {
      const { id: tabId, url } = tab;
      if (!tabsHighlighted[tabId]) {
        debugE && console.log('getThisTabsStatus created a NEW tabsHighlighted entry for id ', tabId,  url);
        status = createNewTabsHighlightedElement(tabId, url);
      } else {
        status = tabsHighlighted[tabId];
        debugE && console.log('getThisTabsStatus found an EXISTING tabsHighlighted entry for id ', tabId, url);
      }
      status = tabsHighlighted[tabId];
    } else {
      status = createNewTabsHighlightedElement(-1, tabURL);
      Object.assign(status, {url: tabURL});
      console.log('getThisTabsStatus query returned no tabs, and DID NOT FIND AN EXISTING tabsHighlighted SO WE created a new tabInfoObj entry with a tabId of -1');
    }

    // console.log('getThisTabsStatus: ', status);
    sendResponse(status);
  });
}

function requestReHighlight (){
  const {chrome: {tabs: {sendMessage, query}}} = window;
  // console.log('requestReHighlight() called');
  query({active: true, currentWindow: true}, function (tabs) {
    let id = '';
    let url = '';
    if (tabs.length) {
      id = tabs[0].id;    // eslint-disable-line prefer-destructuring
      url = tabs[0].url;  // eslint-disable-line prefer-destructuring
      console.log('requestReHighlight() called for tab id (1): '+id);
    } else {
      id = activeTabIdGlobal;
      url = activeUrlGlobal;
      console.log('requestReHighlight() called for tab id (2): '+id);
    }
    sendMessage(id, {command: 'ReHighlight', words: getWordsBackground(url)});
  });
}

// function importFile(contents){
//   //validation needed
//   let validated=true;
//   let temp=JSON.parse(contents);
//   if (temp.Version!==undefined){
//     if (temp.Groups===undefined){validated=false;}
//   }
//   else {
//     validated=false;
//   }
//   if (validated === true){
//     HighlightsData=upgradeVersion(temp);
//   }
//   return validated;
// }

function getWordsBackground (inUrl) {
  let result={};
  for(let neverShowOn in HighlightsData.neverHighlightOn){
    if (inUrl.match(globStringToRegex(HighlightsData.neverHighlightOn[neverShowOn]))){
      return result;
    }
  }
  debugE && console.log('getWordsBackground inURL: ' + inUrl);
  for (let highlightData in HighlightsData.Groups) {
    let returnHighlight=false;
    if (HighlightsData.Groups[highlightData].Enabled){
      if (HighlightsData.Groups[highlightData].ShowOn.length==0){
        returnHighlight=true;
      }
      else {
        for(let showOn in HighlightsData.Groups[highlightData].ShowOn){
          if (inUrl.match(globStringToRegex(HighlightsData.Groups[highlightData].ShowOn[showOn]))){
            returnHighlight=true;
          }
        }
      }
      for(let dontShowOn in HighlightsData.Groups[highlightData].DontShowOn){
        if (inUrl.match(globStringToRegex(HighlightsData.Groups[highlightData].DontShowOn[dontShowOn]))){
          returnHighlight=false;
        }
      }
      if (returnHighlight) {
        result[highlightData] = HighlightsData.Groups[highlightData];
      }
    }
  }
  if (nameToIdMap) {
    result['nameToIdMap'] = nameToIdMap;  // Needed if the endorsement page is in an iFrame, and probably is sufficent if not in an iFrame 3/20/20
  }

  return result;
}

function onPage () {
  const {chrome: {tabs: {sendMessage, query, lastError}}} = window;
  query({active: true, currentWindow: true}, function (tabs) {
    sendMessage(tabs[0].id, {command: 'getMarkers'}, function (result){
      if(result){
        if (lastError) {
          console.warn(' chrome.runtime.sendMessage("getMarkers")', lastError.message);
        }
        return(result);
      }
    });
  });
}

// Set badge color, icon overlay
function showHighlightsCount (label, altColor, tabId)
{
  chrome.browserAction.setBadgeText({'text':label,'tabId':tabId});
  let color = altColor.length === 0 ? 'limegreen' : altColor;
  chrome.browserAction.setBadgeBackgroundColor ({'color': color}); //"#0091EA"});
}

// function getDataFromStorage(dataType) {
//   if(localStorage[dataType]) {return JSON.parse(localStorage[dataType]);} else {return {};}
// }

/*function addWord(inWord) {
  HighlightsData.Words[inWord]="";
  return true;
}*/

function showWordsFound (inState) {
  HighlightsData.ShowFoundWords=inState;
  showFoundWords=inState;
}

// function showDonate(){
//   let today=new Date();
//   return HighlightsData.Donate < today;
// }

// function setDonate(state){
//   let today=new Date();
//   if(state){
//     HighlightsData.Donate=today.setDate(today.getDate()+365);
//   }
//   else {
//     HighlightsData.Donate=today.setDate(today.getDate()+100);
//   }
// }

function setPrintHighlights (inState) {
  HighlightsData.PrintHighlights=inState;
  printHighlights=inState;
}

// function setNeverHighligthOn(inUrls){
//   HighlightsData.neverHighlightOn=inUrls;
//   neverHighlightOn=inUrls;
// }

function addGroup (inGroup, color, fcolor, findwords, showon, dontshowon, inWords, groupType, remoteConfig, regex, showInEditableFields) {
  for(word in inWords){
    inWords[word]=inWords[word].replace(/(\r\n|\n|\r)/gm,'');
  }
  HighlightsData.Groups[inGroup]={'Color':color, 'Fcolor':fcolor, 'Enabled':true, 'ShowOn': showon, 'DontShowOn':dontshowon, 'FindWords':findwords, 'Type':groupType, 'ShowInEditableFields':showInEditableFields};
  if (groupType === 'remote'){
    HighlightsData.Groups[inGroup].RemoteConfig=remoteConfig;
  }
  if (groupType === 'regex'){
    HighlightsData.Groups[inGroup].Regex=regex;
  }

  setWords(inWords, inGroup, color, fcolor, findwords, showon, dontshowon, inGroup);
  requestReHighlight();
  return true;
}

function deleteGroup (inGroup) {
  delete HighlightsData.Groups[inGroup];
  requestReHighlight();
  return true;
}
function flipGroup (inGroup, inAction) {
  HighlightsData.Groups[inGroup].Enabled = inAction === 'enable';
  requestReHighlight();
  return true;
}

function setWords (inWords, inGroup, inColor, inFcolor, inIcon, findwords, showon, dontshowon, newname, groupType, remoteConfig, regex, showInEditableFields) {

  for(word in inWords){
    inWords[word]=inWords[word].replace(/(\r\n|\n|\r)/gm,'');
  }
  console.log('@@@@@@@@@@@@   NOT BEING CALLED @@@@@@@@@@ setWords ' + inWords + ', icon ' + inIcon);
  HighlightsData.Groups[inGroup].Words = inWords;
  HighlightsData.Groups[inGroup].Modified = Date.now();
  HighlightsData.Groups[inGroup].Color = inColor;
  HighlightsData.Groups[inGroup].Fcolor = inFcolor;
  HighlightsData.Groups[inGroup].Icon = inIcon;
  HighlightsData.Groups[inGroup].ShowOn = showon;
  HighlightsData.Groups[inGroup].DontShowOn = dontshowon;
  HighlightsData.Groups[inGroup].FindWords = findwords;
  HighlightsData.Groups[inGroup].ShowInEditableFields = showInEditableFields;
  if (groupType === 'remote'){
    HighlightsData.Groups[inGroup].RemoteConfig=remoteConfig;
  }
  if (groupType === 'regex'){
    HighlightsData.Groups[inGroup].Regex=regex;
  }
  /*for (let word in inWords) {
        if (inWords[word].length > 0) {
            inWord = inWords[word].toString();
            HighlightsData.Groups[inGroup].Words[inWord] = word;
        }
    }*/
  HighlightsData.Groups[inGroup].FindWords = findwords;
  if (inGroup !== newname) {
    HighlightsData.Groups[newname] = HighlightsData.Groups[inGroup];
    delete HighlightsData.Groups[inGroup];
  }

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    updateContextMenu(tabs.url);
  });
  /*chrome.tabs.getSelected(null,function(tab) {
        updateContextMenu(tab.url);
    })*/
  requestReHighlight();
  return true;
}

function dumpTabStatus () {
  console.log('DUMP dumpTabStatus entry');
  for (let key in tabsHighlighted) {
    if (!tabsHighlighted.hasOwnProperty(key)) continue;
    const {url, tabId, showEditor, showHighlights, twitterHandle} = tabsHighlighted[key];
    console.log('DUMP dumpTabStatus key:', key, ', tabId:', tabId, ', showEditor:', showEditor, ',' +
      'showHighlights:', showHighlights, ', twitterHandle:', twitterHandle, ', url:', url);
  }
}

function globStringToRegex (str) {
  return preg_quote(str).replace(/\*/g, '\\S*').replace(/\?/g, '.');
}

// function syncData() {
//   debugE && console.log(Date().toString() + " - start sync");
//
//   for (let highlightData in HighlightsData.Groups) {
//
//     if (HighlightsData.Groups[highlightData].Type === 'remote'){
//       syncWordList(HighlightsData.Groups[highlightData], false,'');
//     }
//   }
// }

function syncWordList (list, notify, listname){
  debugE && console.log('syncing ' + list);
  let xhr = new XMLHttpRequest();
  switch(list.RemoteConfig.type) {
    case 'pastebin':
      getSitesUrl='https://pastebin.com/raw/'+list.RemoteConfig.id;
      break;
    case 'web':
      getSitesUrl=list.RemoteConfig.url;
      break;
  }
  xhr.open('GET', getSitesUrl, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      let resp = sanitizeHtml(xhr.responseText,{allowedTags: [], allowedAttributes: []});
      wordsToAdd = resp.split('\n').filter(function (e) {
        return e;
      });
      for(word in wordsToAdd){
        wordsToAdd[word]=wordsToAdd[word].replace(/(\r\n|\n|\r)/gm,'');
      }
      list.Words=wordsToAdd;
      list.RemoteConfig.lastUpdated=Date.now();
      if(notify){
        chrome.notifications.create('1', {
          'type': 'basic',
          'iconUrl': 'Plugin96.png',
          //"requireInteraction": false,
          'title': 'List sync-ed',
          'message': "'"+listname+"' has been updated"
        });


      }
    }
  };
  xhr.send();
}

function getWeVoteTabs () {
  const { chrome: {tabs: {getAllInWindow}}} = window;
  getAllInWindow(null, function (tabs) {
    let results = '';
    for (let i = 0; i < tabs.length; i++) {
      const { id: tabId, url } = tabs[i];
      if (url.includes('https://wevote.us/') || url.includes('https://quality.wevote.us/') || url.includes('https://localhost:3000/')) {
        results += '|' + tabId +'|';
        console.log('getWeVoteTabs: ' + tabId + ', : ' + url);
      }
    }
    return results;
  });
}

function reloadPdfTabAsHTML (pdfURL, showEditor, tab) {
  const {chrome: {tabs: {create, onUpdated, get}}} = window;
  debugE && console.log('reloadPdfTabAsHTML pdfURL: ' + pdfURL);
  convertPdfToHtmlInS3(pdfURL, (response) => {
    const { s3_url_for_html: htmlURL } = response.res;
    debugE && console.log('reloadPdfTabAsHTML htmlURL: ' + htmlURL);
    const tabId = tab.id;
    console.log('reloadPdfTabAsHTML tab.id: ' + tabId);
    create({ url: htmlURL }, (newTabId) => {
      onUpdated.addListener(function (newTabId, info) {
        if (info.status === 'complete') {
          get(newTabId, (newTab) => setEnableForActiveTab(true, showEditor, newTab));
        }
      });
    });
  });
}

function handleButtonStateChange (showHighlights, showEditor, pdfURL) {
  const {chrome: {tabs: {query}}} = window;
  query({active: true, currentWindow: true}, function (tabs) {
    const tab = tabs && tabs.length ? tabs[0] : undefined;
    const tabID = tab ? tab.id : activeTabIdGlobal;

    // console.log('enabling editor on active tab from openEditPanelButton, handleButtonStateChange tab.id: ', tabID, 'showHighlights:', showHighlights, 'showEditor:',showEditor);
    if (pdfURL) {
      console.log('enabling highlights on active tab FOR A PDF -- popup.js tab.id: ', tabID, pdfURL);
      reloadPdfTabAsHTML(pdfURL, showEditor, tab);
    } else {
      setEnableForActiveTab(showHighlights, showEditor, tab);
    }
  });
}

// // This works on all devices/browsers, and uses IndexedDBShim as a final fallback
// var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
//
// // Open (or create) the database
// var openStatsDB = indexedDB.open("Stats", 1);
//
// // Create the schema
// openStatsDB.onupgradeneeded = function(e) {
//   var db = e.target.result;
//   var store = db.createObjectStore("MyStats", {keyPath: "word"});
//   var index = store.createIndex("NameIndex", ["lastseen", "count"]);
// };
//
// openStatsDB.onsuccess = function() {
//   console.log("steve in openStatsDB.onsuccess");
//   // Start a new transaction
//   var db = openStatsDB.result;
//   var tx = db.transaction("MyStats", "readwrite");
//   var store = tx.objectStore("MyStats");
//   var index = store.index("NameIndex");
//
//   // Add some data
//   store.put({ word:'test' , count: 1});
//
//   // Close the db when the transaction is done
//   tx.oncomplete = function() {
//     db.close();
//   };
// };

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
  return (str + '').replace(new RegExp('/^.*[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-].*$/', 'g'), '\\$&');
}
