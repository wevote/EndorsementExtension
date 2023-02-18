/* global chrome, defaultNeverHighlightOn */

console.log('===================== extWordHighlighter ==========================');

// const { runtime: { getPlatformInfo}, contextMenus: { create, removeAll } } = chrome;

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
/* global defaultNeverHighlightOn */

console.log('-------- extWordHighlighter');

const debugE = true;
let HighlightsData = {};
let activeTabIdGlobal = -1;
let activeUrlGlobal = '';
let activeWindowId =  -1;
let aliasNames = [];
// let createSearchMenuT0 = 0;
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

constructionT0 = -1;
// Immediately Invoked Function Expression
(() => {
  console.log('extWordHighlighter constructor');
  constructionT0 = performance.now();
})();

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

function combineHighlightsLists (ballotItemHighlights, voterGuideHighlights) {
  const overlayOrganizationPositionsDebug = false;
  debugSwLog('ENTERING extWordHighlighter > combineHighlightsLists');
  aliasNames = [];
  nameToIdMap = {};
  for (let i = 0; i < ballotItemHighlights.length; i++) {
    let highlight = ballotItemHighlights[i];
    const {we_vote_id: weVoteId, name} = highlight;
    if (name && name.length > 2) {
      nameToIdMap[name.toLowerCase()] = weVoteId;
      highlight.display = 'DEFAULT';
      highlight.stance = '';
      // Find first highlight dicts in the voterGuideHighlights that shares the same candidate we vote id
      let match = voterGuideHighlights.find(function (possibleAlias) {
        return possibleAlias.we_vote_id === weVoteId;
      });
      if (match && match.display) {
        // If there is a match in voterGuideHighlights, overwrite the default with the org specific highlight
        const {display: displayMatch, stance: stanceMatch} = match;
        overlayOrganizationPositionsDebug && debugSwLog('For ' + name + ' overwriting to ' + displayMatch + ', ' + stanceMatch + ', from ', match);
        highlight.display = displayMatch;
        highlight.stance = stanceMatch;
      }
    } else {
      debugSwLog('Bad highlight received in promoteAliases ', highlight);
    }
  }
}

function overlayOrganizationPositions (voterGuideHighlights) {
  const overlayOrganizationPositionsDebug = true;
  overlayOrganizationPositionsDebug && debugSwLog('ENTERING extWordHighlighter > overlayOrganizationPositions');
  aliasNames = [];
  nameToIdMap = {};
  for (let i = 0; i < voterGuideHighlights.length; i++) {
    let highlight = voterGuideHighlights[i];
    const {we_vote_id: weVoteId, name} = highlight;
    if (name && name.length > 2) {
      nameToIdMap[name.toLowerCase()] = weVoteId;
    } else {
      debugSwLog('Bad highlight received in promoteAliases ', highlight);
    }
  }
}

function initializeHighlightsData (ballotItemHighlights, voterGuideHighlights, neverHighLightOnLocal) {
  const initializeHighlightsDataDebug = true;
  initializeHighlightsDataDebug && debugSwLog('ENTERING extWord > initializeHighlightsData, ballotItemHighlights.length:', ballotItemHighlights.length);
  combineHighlightsLists(ballotItemHighlights, voterGuideHighlights);

  HighlightsData.Version = '12';
  HighlightsData.neverHighlightOn =  preProcessNeverList(neverHighLightOnLocal);
  // let neverHighlightOn = HighlightsData.neverHighlightOn;
  // debugSwLog('neverHighLightOn:', HighlightsData.neverHighLightOn);
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
      'Words': getWordsInGroup(groupName, ballotItemHighlights),
      'Type': 'local',
      'Modified': Date.now()
    };
    debugSwLog('initializeHighlightsData groupName: ', groupName, group);
    HighlightsData.Groups.push(groupName, group);
  }

  printHighlights = HighlightsData.PrintHighlights;
  // debugSwLog("END END END initializeHighlightsData");
}

function initializeVoterGuideHighlightsData (tabId, voterGuideHighlights, neverHighLightOnLocal) {
  const initializeVoterGuideHighlightsDataDebug = true;
  initializeVoterGuideHighlightsDataDebug && debugSwLog('ENTERING extWordHighlighter > initializeVoterGuideHighlightsData');
  overlayOrganizationPositions(voterGuideHighlights);

  HighlightsData.Version = '12';
  HighlightsData.neverHighlightOn =  preProcessNeverList(neverHighLightOnLocal);
  // let {neverHighlightOn} = HighlightsData;
  // debugSwLog('neverHighLightOn:', HighlightsData.neverHighLightOn);
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
      'Words': getWordsInGroup(groupName, voterGuideHighlights),
      'Type': 'local',
      'Modified': Date.now()
    };
    debugSwLog('initializeVoterGuideHighlightsData groupName: ', groupName, group);
    HighlightsData.Groups.push(groupName, group);
  }

  printHighlights = HighlightsData.PrintHighlights;
  // debugSwLog("END END END initializeHighlightsData");
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
  debugSwLog('createSearchMenu has been called');
  chrome.runtime.getPlatformInfo(
    function () {
      chrome.contextMenus.create({
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
  debugSwLog(text);
}

function createNewTabsHighlightedElement (tabId, url) {
  tabsHighlighted[tabId] = { ...tabInfoObj };
  debugSwLog('^^^^^^^^ createNewTabsHighlightedElement before, for tab:', tabId, tabsHighlighted[tabId]);
  Object.assign(tabsHighlighted[tabId], {
    neverHighlightOn: defaultNeverHighlightOn,
    highlighterEnabled,
    tabId,
    url,
  });
  debugSwLog('^^^^^^^^ createNewTabsHighlightedElement after, for tab:', tabId, tabsHighlighted[tabId]);
  return tabsHighlighted[tabId];
}


function updateContextMenu (inUrl, tabId){
  debugSwLog('updating context menu', tabId, inUrl);
  if(inUrl&&noContextMenu.indexOf(inUrl) === -1){
    chrome.contextMenus.removeAll();
    createSearchMenu();
    let contexts = ['selection'];
    let filteredGroups=getWordsBackground(inUrl, tabId);  // Don't show highlights on pages that have been excluded

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

    chrome.contextMenus.create({
      'title': 'Create We Vote Endorsement',
      'contexts': [contexts[0]],
      'id': 'idContextMenuCreateNew'
    });
  }
}

function processUniqueNames (uniqueNamesFromPage) {
  // This function will be called multiple times as the page loads (to catch previously unrendered names), for simple pages this will seem unnecessary
  debugSwLog('uniqueNamesFromPage: ', uniqueNamesFromPage);
  for (let i = 0; i < uniqueNamesFromPage.length; i++) {
    // eslint-disable-next-line prefer-destructuring
    const name = uniqueNamesFromPage[0];
    if (inArray(name, uniqueNames) === -1) {
      uniqueNames.push(name);
      // TODO: add a json fetch of some information
    }
  }
}

function hardResetActiveTab (tabId) {
  debugSwLog('sendMessage hardResetActiveTab tabId:', tabId);
  sendMessage(tabId, {
    tabId: tabId,
  }, function () {
    if (lastError) {
      debugSwLog(' chrome.runtime.sendMessage("hardResetActiveTab")', lastError.message);
    }
    debugSwLog('RESPONSE sendMessage hardResetActiveTab tabId:',tabId);
  });
}

// Called by the "highlight this tab" button on the popup
function setEnableForActiveTab (showHighlights, showEditor, tabId, tabUrl) {
  const setEnableForActiveTabDebug = true;
  const { tabs: { sendMessage, lastError } } = chrome;
  (debugE || setEnableForActiveTabDebug) && debugSwLog('POPUP BUTTON CLOCKED: enabling highlights on active tab ', tabId, ', showEditor: ', showEditor, ', showHighlights:', showHighlights);

  if (!tabId) {
    console.error('setEnableForActiveTab received invalid tab object, and activeTabIdGlobal was undefined');
  }

  let tentativeURL = (tabUrl  && tabUrl.length) ? tabUrl : activeUrlGlobal;

  // Ignore if on a 'neverHighlightOn' page
  if (HighlightsData.neverHighlightOn === undefined) {
    HighlightsData.neverHighlightOn = defaultNeverHighlightOn;
  }
  let {neverHighlightOn} = HighlightsData;

  for (let neverShowOn in neverHighlightOn) {
    if (tentativeURL.match(globStringToRegex(neverHighlightOn[neverShowOn]))) {
      showHighlightsCount('x', 'red', tabId);
      setTimeout(function () {
        showHighlightsCount('', 'white', tabId);
      }, 500);
      return;
    }
  }

  if (showHighlights || showEditor) {
    highlighterEnabled = true;
  }

  if (!showHighlights) {
    clearHighlightsCount();
  }

  debugSwLog('sendMessage displayHighlightsForTabAndPossiblyEditPanes tabId:', tabId,
    ', showHighlights: ', showHighlights, ', showEditor', showEditor);
  sendMessage(tabId, {
    command: 'displayHighlightsForTabAndPossiblyEditPanes',
    highlighterEnabled,
    neverHighlightOn,
    showHighlights,
    showEditor,
    url: tentativeURL,
    tabId: tabId,
  }, function (result) {
    if (lastError) {
      debugSwLog(' chrome.runtime.sendMessage("displayHighlightsForTabAndPossiblyEditPanes")', lastError.message);
    }
    debugSwLog('RESPONSE sendMessage displayHighlightsForTabAndPossiblyEditPanes tabId:',tabId);
    debugSwLog('on click highlight this tab or edit this tab, response received from displayHighlightsForTabAndPossiblyEditPanes ', result);
  });
}

function removeHighlightsForAllTabs () {
  const { runtime: { lastError }, tabs: { sendMessage } } = chrome;

  for (let key in tabsHighlighted) {
    // skip loop if the property is from prototype
    if (!tabsHighlighted.hasOwnProperty(key)) continue;

    const { tabId, url } = tabsHighlighted[key];

    if (tabId === undefined || tabId < 0) continue;

    highlighterEnabled = false;

    debugSwLog('removeHighlightsForAllTabs action tabId: ', tabId, ', url: ', url);

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
        debugSwLog(' chrome.runtime.sendMessage("removeHighlightsForAllTabs")', lastError.message);
      }
      debugSwLog('on click icon, response received to removeHighlightsForAllTabs ', result);
    });
  }
}

chrome.tabs.onActivated.addListener(function (tabId){
  // TODO: I don't think this can work!
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    debugSwLog('XXXXXX set GLOBALS in tabs onactivated', tabId, tabs);
    debugSwLog('XXXXXX set GLOBALS in tabs onactivated', tabId, tabs);
    // Sept 25, 2019: Todo this assumes that the first tab, when you turn it on, is the one that gets the menu!
    if (tabs.length) {
      const { 0 : { id, url, windowId } } = tabs;
      activeTabIdGlobal = id;
      activeUrlGlobal = url;
      activeWindowId = windowId;

      debugSwLog('MESSAGING: chrome.tabs.onActivated.addListener', url, id);
      updateContextMenu(url, id);
    } else {
      debugSwLog('chrome.tabs.onActivated.addListener found no currentWindow for tabId: ' + id);
    }
  });
});

chrome.tabs.onUpdated.addListener(
  function (tab){
    const { url, id } = tab;
    debugSwLog('in tabs onUpdated', id, url);

    if(tab.url !== undefined){
      updateContextMenu(url, id);
    }
  }
);
chrome.tabs.onCreated.addListener(
  function (tab) {
    const { url, id } = tab;
    if(url !== undefined) {
      updateContextMenu(url, id);
    }
  }
);

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  const { tabs: { sendMessage, lastError, query } } = chrome;
  debugSwLog('chrome.contextMenus.onClicked: ' + info.selectionText);

  if (info.menuItemId.indexOf('idContextMenuCreateNew') > -1) {
    sendMessage(tab.id, {
      command: 'createEndorsement',
      selection: info.selectionText,
      pageURL: info.pageUrl,
      tabId: tab.id,
    }, function (result) {
      if (lastError) {
        debugSwLog(' chrome.runtime.sendMessage("createEndorsement")', lastError.message);
      }
      debugSwLog('contextMenus on click, response received to createEndorsement ', result);
    });
  } else if (info.menuItemId.indexOf('idContextMenuRevealRight') > -1) {
    sendMessage(tab.id, {
      command: 'revealRight',
      selection: info.selectionText,
      pageURL: info.pageUrl,
      tabId: tab.id,
    }, function (result) {
      if (lastError) {
        debugSwLog(' chrome.runtime.sendMessage("revealRight")', lastError.message);
      }
      debugSwLog('contextMenus on click, response received to revealRight ', result);
    });
  } else if (info.menuItemId.indexOf('AddTo_') > -1) {
    groupName = info.menuItemId.replace('AddTo_', '');
    let wordAlreadyAdded = false;

    if (HighlightsData.Groups[groupName].Words.indexOf(info.selectionText) > -1) {
      wordAlreadyAdded = true;
    }
    // Removed May 2020, so that we do not have to request the notifications permission
    // if (wordAlreadyAdded) {
    //   chrome.notifications.create('1', {
    //     'type': 'basic',
    //     'iconUrl': 'Plugin96.png',
    //     //"requireInteraction": false,
    //     'title': 'Highlight This',
    //     'message': info.selectionText + ' was already assigned to the word list'
    //   });
    //   //window.alert(info.selectionText + " was already assigned to the word list");  July 2022 no window in service workers!
    // } else {
    //   HighlightsData.Groups[groupName].Words.push(info.selectionText);
    //   HighlightsData.Groups[groupName].Modified = Date.now();
    //   chrome.notifications.create('1', {
    //     'type': 'basic',
    //     'iconUrl': 'Plugin96.png',
    //     // "requireInteraction": false,
    //     'title': 'Added new word',
    //     'message': info.selectionText + ' has been added to ' + groupName + '.\nRefresh the page to see new highlights.'
    //   });
    //
    //   updateContextMenu(tab.url);
    // }
  } else if (info.menuItemId === 'Highlight') {
    // TODO: I don't think this can work!
    query({active: true, currentWindow: true}, function (tabs) {
      sendMessage(tabs[0].id, {command: 'ScrollHighlight'});
    });
  //     }
  //     requestReHighlight();
  //   }
  }
});



// chrome.runtime.onInstalled.addListener(function() {
//   debugSwLog("Highlights plugin installed");
//   chrome.alarms.create("Data sync", {"periodInMinutes":30});
// });
//
// chrome.alarms.onAlarm.addListener(function(alarm){
//   if (alarm.name === "Data sync") {
//     syncData();
//   }
// });

// chrome.storage.onChanged.addListener((storage) => {
//   console.log('storage >>>>>>>>>>>>>>>>>>>> ', storage);
// });
chrome.notifications.onButtonClicked.addListener((ob) => {
  console.log('chrome.notifications.onButtonClicked chrome.notifications.onButtonClicked.addListener >>>>>>>>>>>>>>>>>>>> ', ob);
});



chrome.commands.onCommand.addListener(function (command) {
  console.log('onCommand');
  const {tabs: {sendMessage, query}} = chrome;
  if (command === 'ScrollHighlight') {
    // TODO: I don't think this can work!
    query({active: true, currentWindow: true}, function (tabs) {
      sendMessage(tabs[0].id, {command: 'ScrollHighlight'});
    });
  }
});

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {    // eslint-disable-line complexity
    debugSwLog('MESSAGING: message received -- ' + request.command + ': ', request, sender, sender.tab.id);
    let showVoterGuideHighlights;
    let showCandidateOptionsHighlights;
    if (request.command === 'getTopMenuData') {
      getOrganizationFound(request.url, sendResponse);
    } else if (request.command === 'getHighlights') {
      // Highlight the captured positions
      showVoterGuideHighlights = true;
      showCandidateOptionsHighlights = false;
      getHighlightsListsFromApiServer(request.url, request.voterDeviceId, request.tabId, request.doReHighlight, sendResponse, showVoterGuideHighlights, showCandidateOptionsHighlights);
    } else if (request.command === 'getCombinedHighlights') {
      // Highlight the captured positions AND the recognized candidate names
      showVoterGuideHighlights = true;
      showCandidateOptionsHighlights = true;
      getHighlightsListsFromApiServer(request.url, request.voterDeviceId, request.tabId, request.doReHighlight, sendResponse, showVoterGuideHighlights, showCandidateOptionsHighlights);
    } else if (request.command === 'getPositions') {
      console.log('getPositions received with request ', request);
      getPossiblePositions(request.voterGuidePossibilityId, request.hrefURL, request.voterDeviceId, request.isIFrame, sendResponse);
    } else if (request.command === 'savePosition') {
      debugSwLog('MESSAGING: voterGuidePossibilityPositionSave message received', request, request.removePosition, sender, sender.tab.id);
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
      sendResponse({
        command: request.command,
        words: getWordsBackground(request.url, request.id),
        storedDeviceId: request.voterDeviceId,  // Outgoing voterDeviceId for viewing all other pages
        url: request.url,

      });
    } else if (request.command === 'updateVoterGuide') {
      updatePossibleVoterGuide(request.voterGuidePossibilityId, request.orgName, request.orgTwitter, request.orgState,
        request.comments, request.sendResponse);
    } else if (request.command === 'showWordsFound') {
      sendResponse({success:showWordsFound(request.state)});
    } else if (request.command === 'initiateReHighlightFromContext') {
      requestReHighlight();
      sendResponse({command: request.command, success: true,
        status: 'requestReHighlight invoked asynchronously'});
    } else if(request.command === 'showHighlightsCount') {
      showHighlightsCount(request.label, request.altColor, sender.tab.id);
      if (request.altColor.length === 0) {
        processUniqueNames(request.uniqueNames);
      }
      sendResponse({command: request.command, success: 'ok'});
    } else if(request.command === 'voterGuidePossibilitySave') {
      voterGuidePossibilitySave(request.organizationWeVoteId, request.voterGuidePossibilityId, request.internalNotes, request.contributorEmail, sendResponse);

      // The following commands are from "Highlight This", and are not currently in use

    } else if(request.command === 'setPrintHighlights') {
      sendResponse({command: request.command, success:setPrintHighlights(request.state)});
    } else if(request.command === 'addGroup') {
      debugSwLog('MESSAGING: XXXXXXXXX NO LONGER CALLED XXXXXXXXXXX addGroup message received', request, sender, sender.tab.id);
      sendResponse({command: request.command, success:addGroup(request.group, request.color, request.fcolor, request.icon, request.findwords, request.showon,
        request.dontshowon, request.words, request.groupType, request.remoteConfig, request.regex, request.showInEditableFields)});
    } else if(request.command === 'removeWord') {
      sendResponse({command: request.command, success:removeWord(request.word)});
    } else if(request.command === 'beep') {
      document.body.innerHTML += '<audio src="../../beep.wav" autoplay="autoplay"/>';
    } else if(request.command === 'getStatus') {
      // debugSwLog('if(request.command === \'getStatus\') highlighterEnabled: ', highlighterEnabled);
      getThisTabsStatus(request.tabURL, sendResponse);
    } else if(request.command === 'updateContextMenu'){
      updateContextMenu(request.url, request.id);
      sendResponse({command: request.command, success: 'ok'});
    } else if(request.command === 'flipGroup') {
      sendResponse({command: request.command, success: flipGroup(request.group, request.action)});
    } else if(request.command === 'deleteGroup') {
      sendResponse({command: request.command, success:deleteGroup(request.group)});
    } else if(request.command === 'addWord') {
      sendResponse({command: request.command, success:addWord(request.word)});
    } else if(request.command === 'addWords') {
      sendResponse({command: request.command, success:addWords(request.words)});
    // } else if(request.command === 'syncList') {
    //   sendResponse({success:syncWordList(HighlightsData.Groups[request.group], true,request.group)});
    } else if(request.command === 'setWords') {
      sendResponse({command: request.command, success:setWords(request.words, request.group, request.color, request.fcolor, request.findwords,
        request.showon, request.dontshowon,  request.newname, request.groupType, request.remoteConfig,request.regex, request.showInEditableFields)});
    } else if (request.command === 'myTabId') {
      // tabId will hold the sender tab's id value
      const tabId = sender.tab.id;
      sendResponse({command: request.command, from: 'event', tabId });
    } else if (request.command === 'getWeVoteTabs') {
      sendResponse({command: request.command, from: 'tabs', tabs: getWeVoteTabs() });
    } else if (request.command === 'getStatusForActiveTab') {
      console.log('getStatusForActiveTab message request', request);
      const status = getStatusForActiveTab(request.tabId, request.url);
      sendResponse({command: request.command, from: 'tabs', status: status });
    } else if (request.command === 'getThisTabsId') {
      console.log('getThisTabsId request', request);
      const status = getThisTabsId();
      sendResponse({ from: 'tabs', status });
    // } else if (request.command === 'storeDeviceId') {
    //   const tabId = sender.tab.id;
    //   if (request.voterDeviceId.length) {
    //     // 7/2/22 is this needed, can't do it this way:  localStorage['voterDeviceId'] = request.voterDeviceId;
    //     debugSwLog('extWordHighlighter "storeDeviceId" received from tab: ' + tabId + ', voterDeviceId: ' + request.voterDevicedId);
    //   }
    //   sendResponse({command: request.command, from: 'event', tabId });
    } else if (request.command === 'closeDialogAndUpdatePositionsPanel') {
      const tabId = sender.tab.id;
      debugSwLog('extWordHighlighter "closeDialogAndUpdatePositionsPanel" received from tab: ' + tabId);
    } else if (request.command === 'hardResetActiveTab') {
      const tabId = sender.tab.id;
      debugSwLog('extWordHighlighter "hardResetActiveTab" received from tab: ' + tabId);
      hardResetActiveTab(tabId);
    } else if (request.command === 'updateBackgroundForButtonChange') {
      debugSwLog('extWordHighlighter "updateBackgroundForButtonChange" received from popup');


      handleButtonStateChange(request.showHighlights, request.openEditPanel, request.pdfURL, request.tabId, request.tabUrl);
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
    debugSwLog('getStatusForActiveTab element LOOKUP: ', tabId, url, status);
  } else {
    status = createNewTabsHighlightedElement(tabId, url);
    debugSwLog('getStatusForActiveTab element CREATION: ', tabId, url, status);
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
  const { tabs: { query } } = chrome;
  debugSwLog('extWordHighlighter.getThisTabsStatus () {() called for url', tabURL);
  // 7/22/4:30pm, this does work
  chrome.tabs.query({}, async function (tabs) {
    tab = {};
    for (let i = 0; i < tabs.length; i++) {
      // debugSwLog('extWordHighlighter getThisTabsStatus >>>>>>>>>>>>>>> "' + tabs[i].url );
      if (tabs[i].url === tabURL) {
        tab = tabs[i];
        break;
      }
    }

    let status = {};
    // let found = false;
    if (tab !== {}) {
      const { id: tabId, url } = tab;
      if (!tabsHighlighted[tabId]) {
        debugSwLog('extWordHighlighter.getThisTabsStatus created a NEW tabsHighlighted entry for id ', tabId,  url);
        status = createNewTabsHighlightedElement(tabId, url);
        debugSwLog('extWordHighlighter.getThisTabsStatus created a new tabsHighlighted entry for id ', tabId, url, status);
      } else {
        status = tabsHighlighted[tabId];
        debugSwLog('extWordHighlighter.getThisTabsStatus found an EXISTING tabsHighlighted entry for id ', tabId, url);
      }
      status = tabsHighlighted[tabId];
    } else {
      status = createNewTabsHighlightedElement(-1, tabURL);
      status = {...status, url: tabURL, tabId: tabId};
      debugSwLog('extWordHighlighter.getThisTabsStatus query returned no tabs, and DID NOT FIND AN EXISTING tabsHighlighted SO WE created a new tabInfoObj entry with a tabId of -1');
    }

    // Feb 16, 2023 partial abandoning of the local storage of global state
    const state = await getGlobalState();
    const { highlighterEditorEnabled: showEditor, highlighterEnabledThisTab: showHighlights } = state;
    status = {...status, showEditor: showEditor, showHighlights: showHighlights, highlighterEnabled: showHighlights};
    // Feb 16, 2023 end of change

    debugSwLog('extWordHighlighter.getThisTabsStatus: ', status);
    sendResponse(status);
  });
}

function getThisTabsId (sendResponse) {
  debugSwLog('extWordHighlighter.getThisTabsId');
  // TODO: I don't think this can work!
  query({active: true, currentWindow: true}, function (tabs) {
    const tabId = tabs[0].id;
    debugSwLog('extWordHighlighter.getThisTabsId: ',tabId);
    sendResponse({tabId});
  });
  return tabId;
}

function requestReHighlight (tabId, url){
  debugSwLog('ENTERING extWordHighlighter > requestReHighlight');
  const {tabs: {sendMessage, lastError}} = chrome;
  if (tabId && tabId > 0) {
    debugSwLog('In extWordHighlighter.requestReHighlight, ReHighlight WAS sent -- for tabId:', tabId);
    sendMessage(tabId, {command: 'ReHighlight', words: getWordsBackground(url)}, function () {
      debugSwLog(lastError ? `requestReHighlight lastError ${lastError.message}` : 'requestReHighlight returned');
    });
  } else {
    debugSwLog('In extWordHighlighter.requestReHighlight, ReHighlight could not be sent -- missing tabId:', tabId);
  }
}

function getWordsBackground (inUrl, tabId) {
  debugSwLog('ENTRY to extWordHighlighter.getWordsBackground inURL: ' + inUrl);
  let result={};
  for(let neverShowOn in HighlightsData.neverHighlightOn){
    if (inUrl.match(globStringToRegex(HighlightsData.neverHighlightOn[neverShowOn]))){
      return result;
    }
  }
  for (let highlightData in HighlightsData.Groups) {
    let returnHighlight=false;
    if (HighlightsData.Groups[highlightData].Enabled){
      if (HighlightsData.Groups[highlightData].ShowOn.length === 0){
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

  debugSwLog('Exit from extWordHighlighter.getWordsBackground: ' + inUrl);
  return result;
}

function onPage () {
  const {tabs: {sendMessage, query}} = chrome;
  query({active: true, currentWindow: true}, function (tabs) {
    sendMessage(tabs[0].id, {command: 'getMarkers'}, function (result){
      if(result){
        if (lastError) {
          debugSwLog(' chrome.runtime.sendMessage("getMarkers")', lastError.message);
        }
        return(result);
      }
    });
  });
}

// Set badge color, icon overlay
function showHighlightsCount (label, altColor, tabId)
{
  debugSwLog('ENTERING extWordHighlighter.showHighlightsCount');
  chrome.action.setBadgeText({ text: label });
  let color = altColor.length === 0 ? 'limegreen' : altColor;
  chrome.action.setBadgeBackgroundColor ({'color': color}); //"#0091EA"});
}

// Clear badge
function clearHighlightsCount () {
  debugSwLog('ENTERING extWordHighlighter.clearHighlightsCount');
  chrome.action.setBadgeText({ text: '' });
}

function showWordsFound (inState) {
  HighlightsData.ShowFoundWords=inState;
  showFoundWords=inState;
}

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
  debugSwLog('@@@@@@@@@@@@   NOT BEING CALLED @@@@@@@@@@ setWords ' + inWords + ', icon ' + inIcon);
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

  // ~~TODO: I don't think this can work!~~  Feb 2023: Maybe it can now?
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    const { 0 : { id, url, windowId } } = tabs;
    updateContextMenu(url, id);
  });
  /*chrome.tabs.getSelected(null,function(tab) {
        updateContextMenu(url, id);
    })*/
  requestReHighlight();
  return true;
}

function dumpTabStatus () {
  debugSwLog('DUMP dumpTabStatus entry');
  for (let key in tabsHighlighted) {
    if (!tabsHighlighted.hasOwnProperty(key)) continue;
    const {url, tabId, showEditor, showHighlights, twitterHandle} = tabsHighlighted[key];
    debugSwLog('DUMP dumpTabStatus key:', key, ', tabId:', tabId, ', showEditor:', showEditor, ',' +
      'showHighlights:', showHighlights, ', twitterHandle:', twitterHandle, ', url:', url);
  }
}

function globStringToRegex (str) {
  return preg_quote(str).replace(/\*/g, '\\S*').replace(/\?/g, '.');
}

// function syncData() {
//   debugSwLog(Date().toString() + " - start sync");
//
//   for (let highlightData in HighlightsData.Groups) {
//
//     if (HighlightsData.Groups[highlightData].Type === 'remote'){
//       syncWordList(HighlightsData.Groups[highlightData], false,'');
//     }
//   }
// }

// function syncWordList (list, notify, listname){
//   debugSwLog('syncing ' + list);
//   let xhr = new XMLHttpRequest();
//   switch(list.RemoteConfig.type) {
//     case 'pastebin':
//       getSitesUrl='https://pastebin.com/raw/'+list.RemoteConfig.id;
//       break;
//     case 'web':
//       getSitesUrl=list.RemoteConfig.url;
//       break;
//   }
//   xhr.open('GET', getSitesUrl, true);
//   xhr.onreadystatechange = function () {
//     if (xhr.readyState === 4 && xhr.status === 200) {
//       let resp = sanitizeHtml(xhr.responseText,{allowedTags: [], allowedAttributes: []});
//       wordsToAdd = resp.split('\n').filter(function (e) {
//         return e;
//       });
//       for(word in wordsToAdd){
//         wordsToAdd[word]=wordsToAdd[word].replace(/(\r\n|\n|\r)/gm,'');
//       }
//       list.Words=wordsToAdd;
//       list.RemoteConfig.lastUpdated=Date.now();
//       if(notify){
//         chrome.notifications.create('1', {
//           'type': 'basic',
//           'iconUrl': 'Plugin96.png',
//           //"requireInteraction": false,
//           'title': 'List sync-ed',
//           'message': "'"+listname+"' has been updated"
//         });
//
//
//       }
//     }
//   };
//   xhr.send();
// }

function getWeVoteTabs () {
  const {getAllInWindow} = chrome;
  getAllInWindow(null, function (tabs) {
    let results = '';
    for (let i = 0; i < tabs.length; i++) {
      const { id: tabId, url } = tabs[i];
      if (url.includes('https://wevote.us/') || url.includes('https://quality.wevote.us/') || url.includes('https://localhost:3000/')) {
        results += '|' + tabId +'|';
        debugSwLog('extWordHighlighter.getWeVoteTabs: ' + tabId + ', : ' + url);
      }
    }
    return results;
  });
}

function reloadPdfTabAsHTML (pdfURL, showEditor, tabId) {
  const {tabs: {create, onUpdated, get}} = chrome;
  debugSwLog('extWordHighlighter.reloadPdfTabAsHTML pdfURL: ' + pdfURL);
  convertPdfToHtmlInS3(pdfURL, (response) => {
    const { s3_url_for_html: htmlURL } = response.res;
    debugSwLog('reloadPdfTabAsHTML htmlURL: ' + htmlURL);
    const tabId = tab.id;
    debugSwLog('reloadPdfTabAsHTML tab.id: ' + tabId);
    create({ url: htmlURL }, () => {
      onUpdated.addListener(function (newTabId, info) {
        if (info.status === 'complete') {
          get(newTabId, (newTab) => setEnableForActiveTab(true, showEditor, newTab));
        }
      });
    });
  });
}

function handleButtonStateChange (showHighlights, showEditor, pdfURL, tabId, tabUrl) {
  // debugSwLog('enabling editor on active tab from openEditPanelButton, handleButtonStateChange tab.id: ', tabId, 'showHighlights:', showHighlights, 'showEditor:',showEditor);
  if (pdfURL) {
    debugSwLog('extWordHighlighter.handleButtonStateChange enabling highlights on active tab FOR A PDF -- popup.js tab.id: ', tabId, pdfURL);
    reloadPdfTabAsHTML(pdfURL, showEditor, tabId);
  } else {
    setEnableForActiveTab(showHighlights, showEditor, tabId, tabUrl);
  }
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
//   debugSwLog("steve in openStatsDB.onsuccess");
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
  return (str + '').replace(new RegExp('/^.*[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-].*$/', 'g'), '\\$&');
}
