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

/* April 25, 2019 Steve
   This code relies on the scoping behaviour for the 'var' keyword, changing them all to 'let' will break things.
 */

const debugE = false;
let highlighterEnabled = false;  // Don't globally change var to let! see note above
let showFoundWords = false;
let printHighlights = true;
let HighlightsData = {};
let noContextMenu = ['_generated_background_page.html'];
// let voterName = '';
// let voterPhotoURL = '';
// let voterWeVoteId = '';
// let voterEmail = '';
let uniqueNames = [];
let activeTabIdGlobal = undefined;
let activeUrlGlobal = '';

const groupNames = {
  POSSIBILITY_SUPPORT: 'POSSIBILITY_SUPPORT',
  POSSIBILITY_OPPOSE: 'POSSIBILITY_OPPOSE',
  POSSIBILITY_INFO: 'POSSIBILITY_INFO',       // INFO_ONLY IS A DEPRECATED STATE, COMES THROUGH API AS NO_STANCE
  STORED_SUPPORT: 'STORED_SUPPORT',
  STORED_OPPOSE: 'STORED_OPPOSE',
  STORED_INFO: 'STORED_INFO',                 // INFO_ONLY IS A DEPRECATED STATE, COMES THROUGH API AS NO_STANCE
  DELETED: 'DELETED',
  DEFAULT: 'DEFAULT'
};


$(() => {
  console.log('extWordHighlighter constructor');
});

function getWordsInGroup (groupName, highlightsList) {
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

function initializeHighlightsData (highlightsList, neverHighLightOn) {
  // console.log("START START START initializeHighlightsData");
  HighlightsData.Version = '12';
  HighlightsData.neverHighlightOn =  preProcessNeverList(neverHighLightOn);
  console.log('neverHighLightOn:', neverHighLightOn);
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
      'ShowInEditableFields': false,
      'Enabled': true,
      'FindWords': true,
      'ShowOn': [],
      'DontShowOn': [],
      'Words': getWordsInGroup(groupName, highlightsList),
      'Type': 'local',
      'Modified': Date.now()
    };
    debugE&&console.log('groupName: ' + groupName + ', group: ' + group);
    HighlightsData.Groups.push(groupName, group);
  }
  localStorage['HighlightsData'] = JSON.stringify(HighlightsData);

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

/* eslint-disable indent */
function getColor (typeStance, foreground) {
  switch (typeStance) {
    case 'POSSIBILITY_SUPPORT':
      return foreground ? '#FFFFFF' : '#27af72';
    case 'POSSIBILITY_OPPOSE':
      return foreground ? '#FFFFFF' : '#fb6532';
    case 'POSSIBILITY_INFO':
      return foreground ? '#FFFFFF' : '#7c7b7c';
    case 'STORED_SUPPORT':
      return foreground ? '#28b074' : '#b4e7cd';
    case 'STORED_OPPOSE':
      return foreground ? '#f16936' : '#f7c9b8';
    case 'STORED_INFO':
      return foreground ? '#818082' : '#dad8da';
    case 'DELETED':
      return foreground ? '#aa0311' : '#f0c7c8';
    case 'DEFAULT':
    default:
      return foreground ? '#000' : '#ff6';
  }
}
/* eslint-enable indent */

function createSearchMenu (){
  /* debugE&& */
  console.log('createSearchMenu has been called');
  getPlatformInfo(
    function (i) {
      let shortcut;
      if (i.os === 'mac') {
        shortcut = 'Shift+Cmd+Space';
      }
      else {
        shortcut = 'Shift+Ctrl+Space';
      }
      create({
        'title': 'Jump to word (' + shortcut + ')',
        'id': 'Highlight'  // Is this causing?:  Unchecked runtime.lastError: Cannot create item with duplicate id Highlight
      });
    }
  );
}

//let id = chrome.contextMenus.create({"title": "something", "id":"something", "contexts": ["selection"]});

function updateContextMenu (inUrl){
  debugE&&console.log('updating context menu', inUrl);
  if(inUrl&&noContextMenu.indexOf(inUrl) === -1){
    removeAll();
    createSearchMenu();
    let contexts = ['selection'];
    let filteredGroups=getWords(inUrl);  // Don't show highlights on pages that have been excluded

    let sortedByModified = [];

    for (let group in filteredGroups){
      if(filteredGroups[group].Type !== 'remote'){
        sortedByModified.push([group, filteredGroups[group].Modified])
      }
    }
    sortedByModified.sort(
      function (a, b) {
        return b[1] - a[1]
      }
    );
    let showGroupsInRightClickMenu = false;  // Sept 17, 2019 Disable the display of groups (adding to groups) in the right click menu

    if (showGroupsInRightClickMenu) {
      let numItems = 0;
      for (let i = 0; i < contexts.length; i++) {
        let context = contexts[i];
        /*let sortedarr = [];
        for (group in filteredGroups) {
            sortedarr.push(group)
        }
        sortedarr.sort();*/
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
    let idContextMenuRevealRight = create({
      'title': 'Reveal in Candidate List',
      'contexts': [contexts[0]],
      'id': 'idContextMenuRevealRight'
    });
  }
}

function processUniqueNames (uniqueNamesFromPage) {
  // This function will be called multiple times as the page loads (to catch previously unrendered names), for simple pages this will seem unnecessary
  debugE&&console.log('uniqueNamesFromPage: ', uniqueNamesFromPage);
  for (let i = 0; i < uniqueNamesFromPage.length; i++) {
    // eslint-disable-next-line prefer-destructuring
    const name = uniqueNamesFromPage[0];
    if ($.inArray(name, uniqueNames) === -1) {
      uniqueNames.push(name);
      // TODO: add a json fetch of some information
    }
  }
}

// Clicked the browser bar icon
chrome.browserAction.onClicked.addListener((tab) => {  //TODO: Needs to be tab specific, maybe it is?  Toggle works, but needs to do something
  // Ignore if on a 'neverHighlightOn' page, but unfortunately this doesn't work well unless the Highlights data has already been received
  if (HighlightsData.neverHighlightOn === undefined) {
    HighlightsData.neverHighlightOn = ['*.wevote.us', 'api.wevoteusa.org','localhost'];
  }
  for(let neverShowOn in HighlightsData.neverHighlightOn){
    if (tab.url.match(globStringToRegex(HighlightsData.neverHighlightOn[neverShowOn]))){
      showHighlightsCount('x', 'red', tab.id);
      setTimeout(function () {
        showHighlightsCount('', 'white', tab.id);
      }, 500);
      return;
    }
  }

  highlighterEnabled = !highlighterEnabled;
  console.log('ENABLED STATE CHANGE, now highlighterEnabled = ' + highlighterEnabled + ', tab.id = ' + tab.id + ', tab.url = ' + tab.url);
  chrome.tabs.sendMessage(tab.id, {
    command: 'openWeMenus',
    enabled: highlighterEnabled
  }, function (result) {
    debugE&&console.log('on click icon, response received to openWeMenus ', result);
  });
});


chrome.tabs.onActivated.addListener(function (tabid){
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    console.log('XXXXXX set GLOBALS in tabs onactivated', tabid, tabs);
    // Sept 25, 2019: Todo this assumes that the first tab, when you turn it on, is the one that gets the menu!
    activeTabIdGlobal = tabs[0].id;
    activeUrlGlobal = tabs[0].url;

    updateContextMenu(tabs[0].url);
  });
});

chrome.tabs.onUpdated.addListener(
  function (tabid, tab){
    debugE&&console.log('in tabs onupdated', tabid, tab);

    if(tab.url !== undefined){
      updateContextMenu(tab.url);
    }
  }
);
chrome.tabs.onCreated.addListener(function (tab){if(tab.url !== undefined){updateContextMenu(tab.url);}});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  debugE&&console.log('Steve chrome.contextMenus.onClicked: ' + info.selectionText);

  if (info.menuItemId.indexOf('idContextMenuCreateNew') > -1) {
    chrome.tabs.sendMessage(tab.id, {
      command: 'createEndorsement',
      selection: info.selectionText,
      pageURL: info.pageUrl,
      tabId: tab.id,
    }, function (result) {
      debugE&&console.log('contextMenus on click, response received to createEndorsement ', result);
    });
  } else if (info.menuItemId.indexOf('idContextMenuRevealRight') > -1) {
    chrome.tabs.sendMessage(tab.id, {
      command: 'revealRight',
      selection: info.selectionText,
      pageURL: info.pageUrl,
      tabId: tab.id,
    }, function (result) {
      debugE&&console.log('contextMenus on click, response received to revealRight ', result);
    });
  } else {
    if (info.menuItemId.indexOf('AddTo_') > -1) {
      groupName = info.menuItemId.replace('AddTo_', '');
      let wordAlreadyAdded = false;

      if (HighlightsData.Groups[groupName].Words.indexOf(info.selectionText)>-1) {
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
      }
      else {
        HighlightsData.Groups[groupName].Words.push(info.selectionText);
        HighlightsData.Groups[groupName].Modified = Date.now();
        localStorage['HighlightsData'] = JSON.stringify(HighlightsData);
        chrome.notifications.create('1', {
          'type': 'basic',
          'iconUrl': 'Plugin96.png',
          // "requireInteraction": false,
          'title': 'Added new word',
          'message': info.selectionText + ' has been added to ' + groupName + '.\nRefresh the page to see new highlights.'
        });

        updateContextMenu(tab.url);
      }
      if (info.menuItemId === 'Highlight') {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {command: 'ScrollHighlight'});
        });
      }
      requestReHighlight();
    }
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
  if (command === 'ScrollHighlight') {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: 'ScrollHighlight'});
    });
  }
});

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {    // eslint-disable-line complexity
    /*debugE &&*/
    console.log('XXXXXX message received', request, sender, sender.tab.id);
    //request=JSON.parse(evt.data);
    if (request.command === 'getTopMenuData') {
      getOrganizationFound(request.url, sendResponse);
    } else if (request.command === 'getHighlights') {
      getHighlightsListFromApiServer(request.url, request.doReHighlight, sendResponse, '6000');
    } else if (request.command==='getPositions') {
      getPossiblePositions(request.possibilityId, sendResponse);
    } else if (request.command==='savePosition') {
      console.log('XXXXXX voterGuidePossibilityPositionSave message received', request, sender, sender.tab.id);
      voterGuidePossibilityPositionSave(
        request.itemName,
        request.voterGuidePossibilityId,
        request.voterGuidePossibilityPositionId,
        request.stance,
        request.statementText,
        request.moreInfoURL.trim(),
        sendResponse);
    } else if(request.command==='getVoterInfo') {
      getVoterSignInInfo (sendResponse);
    } else if(request.command==='getWords') {
      if (request.id && request.id.length > 0) {
        localStorage['voterDeviceId'] = request.id;     // Incoming voterDeviceId if we are viewing a wevote domain page.
      }
      sendResponse({
        words:getWords(request.url),
        storedDeviceId: localStorage['voterDeviceId'],  // Outgoing voterDeviceId for viewing all other pages
      });
    } else if (request.command==='updateVoterGuide') {
      updatePossibleVoterGuide(request.voterGuidePossibilityId, request.orgName, request.orgTwitter, request.orgState,
        request.comments, request.sendResponse);
    } else if (request.command==='showWordsFound') {
      sendResponse({success:showWordsFound(request.state)});
    } else if (request.command==='initiateReHighlightFromContext') {
      requestReHighlight();
      sendResponse({success: true,
        status: 'requestReHighlight invoked asynchronously'});
    } else if(request.command==='showHighlightsCount') {
      showHighlightsCount(request.label, request.altColor, sender.tab.id);
      if (request.altColor.length === 0) {
        processUniqueNames(request.uniqueNames);
      }
      sendResponse({success: 'ok'});
    } else if(request.command==='voterGuidePossibilitySave') {
      voterGuidePossibilitySave(request.organizationWeVoteId, request.voterGuidePossibilityId, request.internalNotes, sendResponse);

      // The following commands are from "Highlight This", and are not currently in use

    } else if(request.command==='setPrintHighlights') {
      sendResponse({success:setPrintHighlights(request.state)});
    } else if(request.command==='addGroup') {
      sendResponse({success:addGroup(request.group, request.color, request.fcolor, request.findwords, request.showon,
        request.dontshowon, request.words, request.groupType, request.remoteConfig, request.regex, request.showInEditableFields)});
    } else if(request.command==='removeWord') {
      sendResponse({success:removeWord(request.word)});
    } else if(request.command==='beep') {
      document.body.innerHTML += '<audio src="beep.wav" autoplay="autoplay"/>';
    } else if(request.command==='getStatus') {
      sendResponse({status:highlighterEnabled, printHighlights: printHighlights});
    } else if(request.command==='updateContextMenu'){
      updateContextMenu(request.url);
      sendResponse({success: 'ok'});
    } else if(request.command==='flipGroup') {
      sendResponse({success: flipGroup(request.group, request.action)});
    } else if(request.command==='deleteGroup') {
      sendResponse({success:deleteGroup(request.group)});
    } else if(request.command==='addWord') {
      sendResponse({success:addWord(request.word)});
    } else if(request.command==='addWords') {
      sendResponse({success:addWords(request.words)});
    } else if(request.command==='syncList') {
      sendResponse({success:syncWordList(HighlightsData.Groups[request.group], true,request.group)});
    } else if(request.command==='setWords') {
      sendResponse({success:setWords(request.words, request.group, request.color, request.fcolor, request.findwords,
        request.showon, request.dontshowon,  request.newname, request.groupType, request.remoteConfig,request.regex, request.showInEditableFields)});
    }

    return true;
  });


function requestReHighlight (){
  console.log('requestReHighlight(){ called');
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    let id = '';
    let url = '';
    if (tabs.length) {
      id = tabs[0].id;    // eslint-disable-line prefer-destructuring
      url = tabs[0].url;  // eslint-disable-line prefer-destructuring
    } else {
      id = activeTabIdGlobal;
      url = activeUrlGlobal;
    }
    chrome.tabs.sendMessage(id, {command: 'ReHighlight', words: getWords(url)});
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
//     localStorage["HighlightsData"] = JSON.stringify(HighlightsData);
//   }
//   return validated;
// }

function getWords (inUrl){
  let result={};
  // console.log("getWords inURL: " + inUrl);
  for(let neverShowOn in HighlightsData.neverHighlightOn){
    if (inUrl.match(globStringToRegex(HighlightsData.neverHighlightOn[neverShowOn]))){
      return result;
    }
  }
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
      if(returnHighlight){result[highlightData]=HighlightsData.Groups[highlightData];}
    }
  }
  return result;
}

function onPage (){
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: 'getMarkers'}, function (result){
      if(result){
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
	localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  return true;
}*/

function showWordsFound (inState) {
  HighlightsData.ShowFoundWords=inState;
  showFoundWords=inState;
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
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
//   localStorage['HighlightsData']=JSON.stringify(HighlightsData);
// }

function setPrintHighlights (inState) {
  HighlightsData.PrintHighlights=inState;
  printHighlights=inState;
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
}

// function setNeverHighligthOn(inUrls){
//   HighlightsData.neverHighlightOn=inUrls;
//   neverHighlightOn=inUrls;
//   localStorage["HighlightsData"]=JSON.stringify(HighlightsData);
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

  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  setWords(inWords, inGroup, color, fcolor, findwords, showon, dontshowon, inGroup);
  requestReHighlight();
  return true;
}

function deleteGroup (inGroup) {
  delete HighlightsData.Groups[inGroup];
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  requestReHighlight();
  return true;
}
function flipGroup (inGroup, inAction) {
  HighlightsData.Groups[inGroup].Enabled = inAction === 'enable';
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  requestReHighlight();
  return true;
}

// function flipGroupWordFind(inGroup, inAction) {
//   if (inAction === "enable"){
//     HighlightsData.Groups[inGroup].FindWords=true;
//   }
//   else {
//     HighlightsData.Groups[inGroup].FindWords=false;
//   }
//   localStorage['HighlightsData']=JSON.stringify(HighlightsData);
//   requestReHighlight();
//   return true;
// }
/*function addWords(inWords) {
  //HighlightsData.Words[inWord]="";
	//localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  for(let word in inWords) {
    inWord=inWords[word];
    HighlightsData.Words[inWord]="";
  }
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);

  return true;
}*/

function setWords (inWords, inGroup, inColor, inFcolor, findwords, showon, dontshowon, newname, groupType, remoteConfig, regex, showInEditableFields) {

  for(word in inWords){
    inWords[word]=inWords[word].replace(/(\r\n|\n|\r)/gm,'');
  }

  HighlightsData.Groups[inGroup].Words = inWords;
  HighlightsData.Groups[inGroup].Modified = Date.now();
  HighlightsData.Groups[inGroup].Color = inColor;
  HighlightsData.Groups[inGroup].Fcolor = inFcolor;
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
  localStorage['HighlightsData'] = JSON.stringify(HighlightsData);

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    updateContextMenu(tabs.url);
  });
  /*chrome.tabs.getSelected(null,function(tab) {
        updateContextMenu(tab.url);
    })*/
  requestReHighlight();
  return true;
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
      localStorage['HighlightsData'] = JSON.stringify(HighlightsData);
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
