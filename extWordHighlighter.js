/* eslint init-declarations: 0 */
/* eslint multiline-ternary: 0 */
/* eslint no-empty-function: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-mixed-operators: 0 */
/* eslint no-redeclare: 0 */
/* eslint no-ternary: 0 */
/* eslint no-undef: 0 */
/* eslint no-unused-vars: 0 */

/* April 25, 2019 Steve
   This code relies on the scoping behaviour for the 'var' keyword, changing them all to 'let' will break things.
 */

var highlighterEnabled = true;  // Don't globally change var to let! see note above
var showFoundWords = true;
var printHighlights = true;
var neverHighlightOn = [];
var HighlightsData = {};
var noContextMenu=["_generated_background_page.html"];
var debug= false;

console.log("Steve @ Line 19");
if (localStorage.HighlightsData) {
  var HighlightsData = getDataFromStorage("HighlightsData");
  console.log("Steve found localStorage ", HighlightsData);
  // HighlightsData.Groups["Default Group"].Words =['Steve', 'Sara Bitter', 'Adam VanHo'];
  HighlightsData = upgradeVersion(HighlightsData);
  localStorage["HighlightsData"] = JSON.stringify(HighlightsData);
}
else {
  console.log("Steve creating default");
  var HighlightsData = {};
  HighlightsData.Version = "12";
  HighlightsData.neverHighlightOn = [];
  HighlightsData.ShowFoundWords = true;
  HighlightsData.PrintHighlights = true;
  var today=new Date();
  HighlightsData.Donate=today.setDate(today.getDate()+20);
  HighlightsData.Groups = {
    "Default Group": {
      "Color": "#ff6",
      "Fcolor": "#000",
      "ShowInEditableFields": false,
      "Enabled": true,
      "FindWords": true,
      "ShowOn": [],
      "DontShowOn": [],
      "Words": ['Bitter','Feinstein'],
      "Type": 'local',
      "Modified": Date.now()
    }
  };
  localStorage["HighlightsData"] = JSON.stringify(HighlightsData);
}

printHighlights=HighlightsData.PrintHighlights;
showFoundWords=HighlightsData.ShowFoundWords;
neverHighlightOn=HighlightsData.neverHighlightOn;
//Context menu

function backup(inData, fromVersion){
  /*let a = document.createElement('a');
    let blob = new Blob([JSON.stringify(inData)], {type: "text/plain;charset=UTF-8"});
    a.href = window.URL.createObjectURL(blob);
    a.download = "HighlightThis_BackupBeforeUpgradeFromV"+fromVersion+".txt";
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click(); //this is probably the key - simulating a click on a download link
    a=null;// we don't need this anymore*/


  var blob = new Blob([JSON.stringify(inData)], {type : "text/plain;charset=UTF-8"});
  url = window.URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: "HighlightThis_BackupBeforeUpgradeFromV"+fromVersion+".txt"
  })

}

function upgradeSyncedVersion(syncedData){
  if(!syncedData.HightlightThis){}
}
function upgradeVersion(inData){
  var result={};
  if(!inData.Version){
    //upgrade from v1
    inData={"Version":"6", "neverHighlightOn":[],"ShowFoundWords":true};
    inData.Groups={"Default Group":{"Color":"#ff6", "Fcolor":"#000", "Modified":Date.now(),"Enabled": true,"FindWords":true, "ShowFoundWords":true, "PrintHighlights":true, "ShowOn":[], "DontShowOn":[], "Words":HighlightsData.Words,"Type": 'local'}};

  }
  else {
    if (inData.Version === "2") {
      backup(inData,"2");
      //upgrade from v2
      for (let highlightData in inData.Groups) {
        inData.Groups[highlightData].Enabled=true;
        inData.Groups[highlightData].FindWords=true;
        inData.Groups[highlightData].Fcolor="#000";
        inData.Groups[highlightData].ShowOn=[];
        inData.Groups[highlightData].DontShowOn=[];
      }
      inData.ShowFoundWords=true;
      inData.neverHighlightOn=[];
      inData.Version="6";
    }
    if (inData.Version === "3") {
      backup(inData,"3");
      //upgrade from v3
      for (var highlightData in inData.Groups) {
        inData.Groups[highlightData].FindWords=true;
        inData.Groups[highlightData].Fcolor="#000";
        inData.Groups[highlightData].ShowOn=[];
        inData.Groups[highlightData].DontShowOn=[];
      }
      inData.ShowFoundWords=true;
      inData.neverHighlightOn=[];
      inData.Version="6";
    }
    if (inData.Version === "4") {
      backup(inData,"4");
      //upgrade from v4
      for (var highlightData in inData.Groups) {
        inData.Groups[highlightData].Fcolor="#000";
        inData.Groups[highlightData].ShowOn=[];
        inData.Groups[highlightData].DontShowOn=[];
      }
      inData.ShowFoundWords=true;
      inData.neverHighlightOn=[];
      inData.Version="6";

    }
    if (inData.Version === "5") {
      backup(inData,"5");
      //upgrade from v4
      for (var highlightData in inData.Groups) {
        inData.Groups[highlightData].DontShowOn=[];
      }
      inData.neverHighlightOn=[];
      inData.Version="6";
    }
    if (inData.Version === "6"){
      backup(inData,"6");
      //convert words to array
      for (var highlightData in inData.Groups) {
        var arr = Object.keys(inData.Groups[highlightData].Words).map(function(k) { return k});
        inData.Groups[highlightData].Words=arr;
        inData.Groups[highlightData].Modified=Date.now();
      }
      inData.Version="7";
    }
    if (inData.Version === "7"){
      backup(inData,"7");
      inData.PrintHighlights=true;
      inData.Version="8";
    }
    if (inData.Version === "8"){
      backup(inData,"8");
      for (var highlightData in inData.Groups) {
        inData.Groups[highlightData].Type='local';
      }
      inData.Version="9";
    }
    if (inData.Version === "9"||inData.Version === "10"){
      backup(inData,inData.Version);
      for (var highlightData in inData.Groups) {
        inData.Groups[highlightData].ShowInEditableFields=false;
      }
      inData.Version="11";
    }
    if (inData.Version === "11"){
      backup(inData,inData.Version);
      var today=new Date();
      inData.Donate=today;
      inData.Version="12";
    }


  }
  return inData;
}


function createSearchMenu(){
  console.log("steve in createSearchMenu");
  chrome.runtime.getPlatformInfo(
    function (i) {

      if (i.os == "mac") {
        var shortcut = "Shift+Cmd+Space";
      }
      else {
        var shortcut = "Shift+Ctrl+Space";
      }
      var highLight = chrome.contextMenus.create({
        "title": "Jump to word (" + shortcut + ")",
        "id": "Highlight"
      });
    }
  );
}

//let id = chrome.contextMenus.create({"title": "something", "id":"something", "contexts": ["selection"]});

function updateContextMenu(inUrl){
  debug&&console.log('updating context menu', inUrl);
  if(inUrl&&noContextMenu.indexOf(inUrl) === -1){
    chrome.contextMenus.removeAll();
    createSearchMenu();
    var contexts = ["selection"];
    var filteredGroups=getWords(inUrl);  // Don't show highlights on pages that have been excluded

    var sortedByModified = [];

    for (var group in filteredGroups){
      if(filteredGroups[group].Type!="remote"){
        sortedByModified.push([group, filteredGroups[group].Modified])
      }
    }
    sortedByModified.sort(
      function(a, b) {
        return b[1] - a[1]
      }
    );
    var numItems=0;
    for (var i = 0; i < contexts.length; i++) {
      var context = contexts[i];
      /*var sortedarr = [];
      for (group in filteredGroups) {
          sortedarr.push(group)
      }
      sortedarr.sort();*/
      sortedByModified.forEach(function (group) {
        if (numItems === 10){
          //create a parent menu
          let parentid = chrome.contextMenus.create({
            "title": "More", "contexts": [context],
            "id": "more"
          });
        }
        var title = "+ " + group[0];
        if (numItems>9){
          var id = chrome.contextMenus.create({
            "title": title, "contexts": [context],
            "id": "AddTo_" + group[0], "parentId":"more"
          });
        } else {
          var id = chrome.contextMenus.create({
            "title": title, "contexts": [context],
            "id": "AddTo_" + group[0]
          });
        }
        numItems+=1;
      });
    }

    // STEVE, not the way to do it!
    let idwe = chrome.contextMenus.create({
      "title": "Create We Vote Endorsement",
      "contexts": [contexts[0]],
      "id": "idwe"
    });
  }
}

//TODO : fix for Firefox
chrome.tabs.onActivated.addListener(function(tabid){
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    debug&&console.log("in tabs onactivated", tabid, tabs);

    updateContextMenu(tabs[0].url);
  });
});

chrome.tabs.onUpdated.addListener(
  function(tabid, tab){
    debug&&console.log("in tabs onupdated", tabid, tab);

    if(tab.url!=undefined){
      updateContextMenu(tab.url);
    }
  }
);
chrome.tabs.onCreated.addListener(function(tab){if(tab.url!=undefined){updateContextMenu(tab.url);}});


chrome.contextMenus.onClicked.addListener(function (info, tab) {
  console.log("Steve chrome.contextMenus.onClicked: ");

  // There is no DOM to attach to here
  chrome.tabs.sendMessage(tab.id, {command: "openWeDialog"}, function(result) {
    console.log( "on click result ", result);
  });

  if (info.menuItemId.indexOf("AddTo_") > -1) {
    groupName = info.menuItemId.replace("AddTo_", "");
    var wordAlreadyAdded = false;

    if (HighlightsData.Groups[groupName].Words.indexOf(info.selectionText)>-1) {
      wordAlreadyAdded = true;
    }
    if (wordAlreadyAdded) {
      chrome.notifications.create("1", {
        "type": "basic",
        "iconUrl": "Plugin96.png",
        //"requireInteraction": false,
        "title": "Highlight This",
        "message": info.selectionText + " was already assigned to the word list"
      });
      //window.alert(info.selectionText + " was already assigned to the word list");
    }
    else {
      HighlightsData.Groups[groupName].Words.push(info.selectionText);
      HighlightsData.Groups[groupName].Modified = Date.now();
      localStorage['HighlightsData'] = JSON.stringify(HighlightsData);
      chrome.notifications.create("1", {
        "type": "basic",
        "iconUrl": "Plugin96.png",
        // "requireInteraction": false,
        "title": "Added new word",
        "message": info.selectionText + " has been added to " + groupName + ".\nRefresh the page to see new highlights."
      });

      updateContextMenu(tab.url);
    }
  }
  if (info.menuItemId === "Highlight") {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: "ScrollHighlight"});
    });
  }
  requestReHighlight();
});



chrome.runtime.onInstalled.addListener(function() {
  console.log("Highlights plugin installed");
  chrome.alarms.create("Data sync", {"periodInMinutes":30});
});

chrome.alarms.onAlarm.addListener(function(alarm){
  if (alarm.name === "Data sync") {
    syncData();
  }
});


chrome.commands.onCommand.addListener(function(command) {
  if (command === "ScrollHighlight") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: "ScrollHighlight"});
    });
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    debug && console.log("message received", request, sender);
    //request=JSON.parse(evt.data);
    if(request.command==="showWordsFound") {
      sendResponse({success:showWordsFound(request.state)});
    }
    if(request.command==="setPrintHighlights") {
      sendResponse({success:setPrintHighlights(request.state)});
    }
    if(request.command==="getWords") {
      sendResponse({words:getWords(request.url)});
    }
    if(request.command==="addGroup") {
      sendResponse({success:addGroup(request.group, request.color, request.fcolor, request.findwords, request.showon, request.dontshowon, request.words, request.groupType, request.remoteConfig, request.regex, request.showInEditableFields)});
    }
    if(request.command==="deleteGroup") {
      sendResponse({success:deleteGroup(request.group)});
    }
    if(request.command==="addWord") {
      sendResponse({success:addWord(request.word)});
    }
    if(request.command==="addWords") {
      sendResponse({success:addWords(request.words)});
    }
    if(request.command==="syncList") {
      sendResponse({success:syncWordList(HighlightsData.Groups[request.group], true,request.group)});
    }
    if(request.command==="setWords") {
      sendResponse({success:setWords(request.words, request.group, request.color, request.fcolor, request.findwords, request.showon, request.dontshowon,  request.newname, request.groupType, request.remoteConfig,request.regex, request.showInEditableFields)});
    }
    if(request.command==="removeWord") {
      sendResponse({success:removeWord(request.word)});
    }
    if(request.command==="showHighlights") {
      showHighlights(request.label,sender.tab.id);
      sendResponse({success: 'ok'});
    }
    if(request.command==="beep") {
      document.body.innerHTML += '<audio src="beep.wav" autoplay="autoplay"/>';
    }
    if(request.command==="getStatus") {
      sendResponse({status:highlighterEnabled, printHighlights: printHighlights});
    }
    if(request.command==="updateContextMenu"){
      updateContextMenu(request.url);
      sendResponse({success: 'ok'});

    }
    if(request.command==="flipGroup") {
      sendResponse({success: flipGroup(request.group, request.action)});
    }
    return true;
  });


function requestReHighlight(){
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: "ReHighlight", words:getWords(tabs[0].url)});
  });
}
function importFile(contents){
  //validation needed
  var validated=true;
  var temp=JSON.parse(contents);
  if (temp.Version!=undefined){
    if (temp.Groups==undefined){validated=false;}
  }
  else {
    validated=false;

  }
  if (validated === true){
    HighlightsData=upgradeVersion(temp);
    localStorage["HighlightsData"] = JSON.stringify(HighlightsData);
  }
  return validated;
}
function getWords(inUrl){
  var result={};
  for(var neverShowOn in HighlightsData.neverHighlightOn){
    if (inUrl.match(globStringToRegex(HighlightsData.neverHighlightOn[neverShowOn]))){
      return result;
    }
  }
  for (var highlightData in HighlightsData.Groups) {
    var returnHighlight=false;
    if (HighlightsData.Groups[highlightData].Enabled){
      if (HighlightsData.Groups[highlightData].ShowOn.length==0){
        returnHighlight=true;
      }
      else {
        for(var showOn in HighlightsData.Groups[highlightData].ShowOn){
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

function onPage(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: "getMarkers"}, function(result){
      if(result){
        return(result);
      }
    });
  });
}

function showHighlights(label, tabId)
{
  chrome.browserAction.setBadgeText({"text":label,"tabId":tabId});
  chrome.browserAction.setBadgeBackgroundColor ({"color":"#0091EA"});
}

function getDataFromStorage(dataType) {
  if(localStorage[dataType]) {return JSON.parse(localStorage[dataType]);} else {return {};}
}

/*function addWord(inWord) {
  HighlightsData.Words[inWord]="";
	localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  return true;
}*/
function showWordsFound(inState) {
  HighlightsData.ShowFoundWords=inState;
  showFoundWords=inState;
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
}

function showDonate(){
  var today=new Date();
  if (HighlightsData.Donate<today){return true;}
  return false;
}

// function setDonate(state){
//   var today=new Date();
//   if(state){
//     HighlightsData.Donate=today.setDate(today.getDate()+365);
//   }
//   else {
//     HighlightsData.Donate=today.setDate(today.getDate()+100);
//   }
//   localStorage['HighlightsData']=JSON.stringify(HighlightsData);
// }

function setPrintHighlights(inState) {
  HighlightsData.PrintHighlights=inState;
  printHighlights=inState;
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
}

function setNeverHighligthOn(inUrls){
  HighlightsData.neverHighlightOn=inUrls;
  neverHighlightOn=inUrls;
  localStorage["HighlightsData"]=JSON.stringify(HighlightsData);
}

function addGroup(inGroup, color, fcolor, findwords, showon, dontshowon, inWords,groupType, remoteConfig, regex, showInEditableFields) {
  for(word in inWords){
    inWords[word]=inWords[word].replace(/(\r\n|\n|\r)/gm,"");
  }
  HighlightsData.Groups[inGroup]={"Color":color, "Fcolor":fcolor, "Enabled":true, "ShowOn": showon, "DontShowOn":dontshowon, "FindWords":findwords, "Type":groupType, "ShowInEditableFields":showInEditableFields};
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

function deleteGroup(inGroup) {
  delete HighlightsData.Groups[inGroup];
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  requestReHighlight();
  return true;
}
function flipGroup(inGroup, inAction) {
  if (inAction === "enable"){
    HighlightsData.Groups[inGroup].Enabled=true;
  }
  else {
    HighlightsData.Groups[inGroup].Enabled=false;
  }
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  requestReHighlight();
  return true;
}

function flipGroupWordFind(inGroup, inAction) {
  if (inAction === "enable"){
    HighlightsData.Groups[inGroup].FindWords=true;
  }
  else {
    HighlightsData.Groups[inGroup].FindWords=false;
  }
  localStorage['HighlightsData']=JSON.stringify(HighlightsData);
  requestReHighlight();
  return true;
}
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

function setWords(inWords, inGroup, inColor, inFcolor, findwords, showon, dontshowon, newname, groupType, remoteConfig, regex, showInEditableFields) {

  for(word in inWords){
    inWords[word]=inWords[word].replace(/(\r\n|\n|\r)/gm,"");
  }

  HighlightsData.Groups[inGroup].Words = inWords;
  HighlightsData.Groups[inGroup].Modified = Date.now();
  HighlightsData.Groups[inGroup].Color = inColor;
  HighlightsData.Groups[inGroup].Fcolor = inFcolor;
  HighlightsData.Groups[inGroup].ShowOn = showon;
  HighlightsData.Groups[inGroup].DontShowOn = dontshowon;
  HighlightsData.Groups[inGroup].FindWords = findwords;
  HighlightsData.Groups[inGroup].ShowInEditableFields = showInEditableFields;
  if (groupType=='remote'){
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
  if (inGroup != newname) {
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

function globStringToRegex(str) {
  return preg_quote(str).replace(/\*/g, '\\S*').replace(/\?/g, '.');
}




function syncData() {
  debug && console.log(Date().toString() + " - start sync");

  for (var highlightData in HighlightsData.Groups) {

    if (HighlightsData.Groups[highlightData].Type === 'remote'){
      syncWordList(HighlightsData.Groups[highlightData], false,'');
    }
  }

}
function syncWordList(list, notify, listname){
  debug && console.log('syncing ' + list);
  var xhr = new XMLHttpRequest();
  switch(list.RemoteConfig.type) {
  case 'pastebin':
    getSitesUrl='https://pastebin.com/raw/'+list.RemoteConfig.id;
    break;
  case 'web':
    getSitesUrl=list.RemoteConfig.url;
    break;
  }
  xhr.open("GET", getSitesUrl, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var resp = sanitizeHtml(xhr.responseText,{allowedTags: [], allowedAttributes: []});
      wordsToAdd = resp.split("\n").filter(function (e) {
        return e;
      });
      for(word in wordsToAdd){
        wordsToAdd[word]=wordsToAdd[word].replace(/(\r\n|\n|\r)/gm,"");
      }
      list.Words=wordsToAdd;
      list.RemoteConfig.lastUpdated=Date.now();
      localStorage['HighlightsData'] = JSON.stringify(HighlightsData);
      if(notify){
        chrome.notifications.create("1", {
          "type": "basic",
          "iconUrl": "Plugin96.png",
          //"requireInteraction": false,
          "title": "List sync-ed",
          "message": "'"+listname+"' has been updated"
        });


      }
    }
  };
  xhr.send();
}

// This works on all devices/browsers, and uses IndexedDBShim as a final fallback
var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

// Open (or create) the database
var openStatsDB = indexedDB.open("Stats", 1);

// Create the schema
openStatsDB.onupgradeneeded = function(e) {
  var db = e.target.result;
  var store = db.createObjectStore("MyStats", {keyPath: "word"});
  var index = store.createIndex("NameIndex", ["lastseen", "count"]);
};

openStatsDB.onsuccess = function() {
  console.log("steve in openStatsDB.onsuccess");
  // Start a new transaction
  var db = openStatsDB.result;
  var tx = db.transaction("MyStats", "readwrite");
  var store = tx.objectStore("MyStats");
  var index = store.index("NameIndex");

  // Add some data
  store.put({ word:'test' , count: 1});

  // Close the db when the transaction is done
  tx.oncomplete = function() {
    db.close();
  };
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
  return (str + '').replace(new RegExp('/^.*[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-].*$/', 'g'), '\\$&');
}