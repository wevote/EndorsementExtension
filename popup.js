var HighlightsData = JSON.parse(localStorage["HighlightsData"]);
var wordsToAdd = [];
var Colors = ["#fff", "#000", "#ff6", "#a0ffff", "#0DD5FC", "#9f9", "#3DFF33", "#FF9933", "#f99", "#f6f"];
var FColors = ["#fff", "#000", "#ff6", "#a0ffff", "#0DD5FC", "#9f9", "#3DFF33", "#FF9933", "#f99", "#f6f"];
var onPageShown = false;
var Collapsed=true;
var enableSaveButton=false;
var debug=false;
const useProductionAPIs = true;
const rootApiURL = useProductionAPIs ? 'https://api.wevoteusa.org/apis/v1' : 'http://127.0.0.1:8000/apis/v1';


document.addEventListener('DOMContentLoaded', function () {
  fillLiterals();
  //settings page
  document.getElementById("exportLink").addEventListener('click', function () {
    exportToFile();
    return false;
  });
  document.getElementById("settingsLink").addEventListener('click', function () {
    showSettings();
  });

  document.getElementById('importFile').addEventListener('change',function(){
    document.getElementById('importFileLink').innerHTML = chrome.i18n.getMessage("field_import") + ' ' + document.getElementById('importFile').files[0].name;
    document.getElementById('importFileLink').style.display="block";
  });

  document.getElementById("backFromSettings").addEventListener('click', function () {
    document.getElementById("settingsGroup").style.display = "none";
    document.getElementById("wordDisplay").style.display = "block";
    document.getElementById("menu").style.display = "block  ";
    drawInterface();
    return false;
  });

  document.getElementById("cancelSettings").addEventListener('click', function () {
    cancelSettings();
    return false;
  });
  document.getElementById("saveSettings").addEventListener('click', function () {
    saveSettings();
    return false;
  });
  document.getElementById("importFileLink").addEventListener('click', function () {
    startRead();
    return false;
  });

  //home page
  document.getElementById("collapseAll").addEventListener('click', function () {
    if (Collapsed){
      expandAll();
    }
    else {
      collapseAll();
    }

    return false;
  });

  // STEVE STEVE STEVE
  document.getElementById("loginTest").addEventListener('click', function () {
    let voterDeviceId = localStorage['voterDeviceId'];
    //const weVoteServerApiRootUrl = 'http://localhost:8000/apis/v1';  // 'https://api.wevoteusa.org/apis/v1';

    if (voterDeviceId === undefined) {
      const requesIdURL = `${rootApiURL}/deviceIdGenerate/`;
      window.$.getJSON(requesIdURL, '', (res) => {
        // console.log("get voter device id", res);
        voterDeviceId = res.voter_device_id;
        // console.log('voterDeviceId' + voterDeviceId);
        localStorage['voterDeviceId'] = voterDeviceId;
        // console.log('localStorage[\'voterDeviceId\'] =' +  localStorage['voterDeviceId'] );
      }).fail((err) => {
        console.log('error getting new voterDeviceId', err);
      });
    }

    // // test 3c
    //
    // getAccessToken(() => {
    //   console.log('oauth2_access_token received');
    // });

    // // Do first step of twitter oAuth
    // const requestOauth1URL = `${weVoteServerApiRootUrl}/twitterSignInStart` +
    //   `?cordova=true&voter_device_id=${voterDeviceId}&return_url=http://nonsense.com`;
    //
    // window.$.get(requestOauth1URL, '', (res) => {
    //   console.log("get html from test wevote oauth1", res);
    //
    // }).fail((err) => {
    //   console.log('error', err);
    // });

    return false;
  });



  document.getElementById("filterwords").addEventListener('keyup',function(){filterWords(this.value)});

  //words found page
  document.getElementById("dontshowwords").addEventListener('click', function () {
    showWordsFound(false);
    return false;
  });

  //word group page
  document.getElementById("cancelAddGroup").addEventListener('click', function () {
    cancelAddGroup();
    return false;
  });

  document.getElementById("cancelCreateGroup").addEventListener('click', function () {
    cancelAddGroup();
    return false;
  });


  document.getElementById("words").addEventListener('focusout',function(){
    //check if there are non unicode characters
    hintNonUnicodeChar(this.value);

  });

  /*document.getElementById("words").addEventListener('paste',function(){
        //check if there are non unicode characters
        hintNonUnicodeChar(this.value);

    })*/

  /*document.getElementById("backToFirstScreen").addEventListener('click', function () {
        backToFirstScreen();
        return false;
    });*/
  /*document.getElementById("setLimits").addEventListener('click', function () {
        setLimits();
        return false;
    });*/
  document.getElementById("browseHighlight").addEventListener('click', function () {
    browseHighlight();
    return false;
  });
  document.getElementById("toConfig").addEventListener('click', function () {
    showConfig();
    drawInterface();
    return false;
  });
  document.getElementById("groupForm").addEventListener('submit', function () {
    submitGroup();
    return false;
  });
  document.getElementById("yesDeleteGroup").addEventListener('click', function () {
    yesDeleteGroup();
    return false;
  });
  document.getElementById("noDeleteGroup").addEventListener('click', function () {
    noDeleteGroup();
    return false;
  });
  document.getElementById("deleteGroupLink").addEventListener('click', function () {
    deleteGroup();
    return false;
  });
  document.getElementById("myonoffswitch").addEventListener('change', function () {
    onOff();
    return false;
  });
  document.getElementById("addGroupLink").addEventListener('click', function () {
    addGroup();
    return false;
  });

  document.getElementById("tabSettingsGeneral").addEventListener('click', function (ev) {
    switchTab(ev, "settingsGeneral","settings");
    return false;
  });
  document.getElementById("tabSettingsBackup").addEventListener('click', function (ev) {
    switchTab(ev, "settingsBackup","settings");
    return false;
  });

  document.getElementById("tabGeneral").addEventListener('click', function (ev) {
    switchTab(ev, "firstScreen","general");
    return false;
  });
  document.getElementById("tabLimitations").addEventListener('click', function (ev) {
    switchTab(ev, "secondScreen","general");
    return false;
  });
  document.getElementById("tabAdvanced").addEventListener('click', function (ev) {
    switchTab(ev, "thirdScreen","general");
    return false;
  });

  document.getElementById("syncLink").addEventListener('click', function () {
    syncList();
    return false;
  });
  document.getElementById("createGroupLink").addEventListener('click', function () {
    createGroup();
    return false;
  });

  document.getElementById("field_remoteType").addEventListener('change',function(){

    document.getElementById("pastbinAttributes").style.display="none";
    document.getElementById("webAttributes").style.display="none";


    switch(document.getElementById("field_remoteType").value){
    case 'web':
      document.getElementById("webAttributes").style.display="block";

      break;
    case 'pastebin':
      document.getElementById("pastbinAttributes").style.display="block";

      break;
    }

    debug && console.log(document.getElementById("field_remoteType").value);
  });

  if (onPageShown) {
    drawInterface();
  }
  else {
    onPage();
  }
});

// const bearerTokenCredentials = 'AAAAAAAAAAAAAAAAAAAAANnvjwAAAAAAnlL1G17nvM5qidtRmRLUwcAmb%2Bw%3DdRVXwWzLbs0IWDKwnDiYIOlUFOG6otQYLEYN7eMsWBqCpxIfV7';
//
// function getAccessToken(cb) {
  //const c = this;
  // let oauth2_access_token = '';
  // $.ajax({
  //   type: 'POST',
  //   url: 'https://api.twitter.com/oauth2/token',
  //   headers: {
  //     'Authorization': 'Basic ' + bearerTokenCredentials,
  //     'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
  //   },
  //   data: {'grant_type': 'client_credentials'},
  //   dataType: 'json',
  //   xhrFields: { withCredentials: false },
  //   success: (res) => {
  //     console.log("token succes = ", res );
  //     oauth2_access_token = res['access_token'];
  //     cb();
  //   },
  //   error: function (jqXHR) {
  //     if (jqXHR.status == 500) {
  //       console.log('Internal error: ' + jqXHR.responseText);
  //     } else {
  //       console.log('Unexpected error: ' + jqXHR.responseText);
  //     }
  //   }
  // })
// }


function hintNonUnicodeChar(value){
  if(value.match(/[^a-zA-Z0-9_\s]/)){
    document.getElementById("hintNonUnicode").style.display="block";
  }
  else{
    document.getElementById("hintNonUnicode").style.display="none";
  }
}


// function donate(state){
//   document.getElementById("donate").style.display="none";
//   document.getElementById("menu").style.display="block";
//   if(state){
//     window.open("https://www.paypal.me/WDeboel/1EUR");
//   }
//   chrome.extension.getBackgroundPage().setDonate(state);
//   if (onPageShown) {
//     drawInterface();
//   }
//   else {
//     onPage();
//   }
// }

function fillLiterals(){
  document.getElementById("litTitle").innerHTML = chrome.i18n.getMessage("popup_title");
  document.getElementById("popup_title").innerHTML = chrome.i18n.getMessage("popup_title");
  document.getElementById("byline").innerHTML = chrome.i18n.getMessage("popup_byline");
  document.getElementById("popup_nowords").innerHTML = chrome.i18n.getMessage("popup_nowords");
  document.getElementById("collapseAll").innerHTML = chrome.i18n.getMessage("popup_collapseAll");
  document.getElementById("popup_create1").innerHTML = chrome.i18n.getMessage("popup_create1");
  document.getElementById("popup_create2").innerHTML = chrome.i18n.getMessage("popup_create2");
  document.getElementById("toConfig").innerHTML = chrome.i18n.getMessage("popup_configureWords");
  document.getElementById("foundWords").innerHTML = chrome.i18n.getMessage("popup_foundWords");
  document.getElementById("dontshowwords").innerHTML = chrome.i18n.getMessage("popup_dontshowwords");
  document.getElementById("popup_tip1").innerHTML = chrome.i18n.getMessage("popup_tip1");
  document.getElementById("popup_tip2").innerHTML = chrome.i18n.getMessage("popup_tip2");
  document.getElementById("popup_tip3").innerHTML = chrome.i18n.getMessage("popup_tip3");
  document.getElementById("deleteGroupLink").innerHTML = chrome.i18n.getMessage("deleteGroupLink");
  document.getElementById("field_listname").innerHTML = chrome.i18n.getMessage("field_listname");
  document.getElementById("field_colors").innerHTML = chrome.i18n.getMessage("field_colors");
  document.getElementById("field_colors_help").innerHTML = chrome.i18n.getMessage("field_colors_help");
  document.getElementById("field_foreground").innerHTML = chrome.i18n.getMessage("field_foreground");
  document.getElementById("field_background").innerHTML = chrome.i18n.getMessage("field_background");
  document.getElementById("example1").innerHTML = chrome.i18n.getMessage("example1");
  document.getElementById("example2").innerHTML = chrome.i18n.getMessage("example2");
  document.getElementById("example").innerHTML = chrome.i18n.getMessage("example");
  document.getElementById("field_detection").innerHTML = chrome.i18n.getMessage("field_detection");
  document.getElementById("field_detection_help").innerHTML = chrome.i18n.getMessage("field_detection_help");
  document.getElementById("field_words").innerHTML = chrome.i18n.getMessage("field_words");
  document.getElementById("field_words_help").innerHTML = chrome.i18n.getMessage("field_words_help");
  document.getElementById("sites_info").innerHTML = chrome.i18n.getMessage("sites_info");
  document.getElementById("field_highlightOn").innerHTML = chrome.i18n.getMessage("field_highlightOn");
  document.getElementById("field_dontHighlight").innerHTML = chrome.i18n.getMessage("field_dontHighlight");
  document.getElementById("cancelAddGroup").innerHTML = chrome.i18n.getMessage("popup_cancel");
  document.getElementById("popup_settings").innerHTML = chrome.i18n.getMessage("popup_settings");
  // document.getElementById("field_showFoundWords").innerHTML = chrome.i18n.getMessage("field_showFoundWords");
  document.getElementById("field_printHighlights").innerHTML = chrome.i18n.getMessage("field_printHighlights");
  // document.getElementById("field_neverHighlightOn").innerHTML = chrome.i18n.getMessage("field_neverHighlightOn");
  // document.getElementById("field_neverHighlightOn_help").innerHTML = chrome.i18n.getMessage("field_neverHighlightOn_help");
  document.getElementById("cancelSettings").innerHTML = chrome.i18n.getMessage("popup_cancel");
  document.getElementById("saveSettings").innerHTML = chrome.i18n.getMessage("popup_save");
  document.getElementById("field_exportSettings").innerHTML = chrome.i18n.getMessage("field_exportSettings");
  document.getElementById("exportLink").innerHTML = chrome.i18n.getMessage("field_export");
  document.getElementById("field_importSettings").innerHTML = chrome.i18n.getMessage("field_importSettings");
  document.getElementById("importFileLink").innerHTML = chrome.i18n.getMessage("field_import");
  document.getElementById("backFromSettings").innerHTML = chrome.i18n.getMessage("popup_back");
  document.getElementById("popup_confirmDelete").innerHTML = chrome.i18n.getMessage("popup_confirmDelete");
  document.getElementById("yesDeleteGroup").innerHTML = chrome.i18n.getMessage("popup_yes");
  document.getElementById("noDeleteGroup").innerHTML = chrome.i18n.getMessage("popup_no");
  document.getElementById("labelListName").innerHTML = chrome.i18n.getMessage("popup_labelListName");
  document.getElementById("newGroupTitle").innerHTML = chrome.i18n.getMessage("title_newGroupType");
  document.getElementById("newGroupDetail").innerHTML = chrome.i18n.getMessage("newGroupDetail");
  document.getElementById("cancelCreateGroup").innerHTML = chrome.i18n.getMessage("popup_cancel");
  document.getElementById("createGroupLink").innerHTML = chrome.i18n.getMessage("popup_next");
  document.getElementById("localLabel").innerHTML = chrome.i18n.getMessage("localLabel");
  document.getElementById("remoteLabel").innerHTML = chrome.i18n.getMessage("remoteLabel");
  document.getElementById("field_source").innerHTML = chrome.i18n.getMessage("field_source");

  document.getElementById("donate1").innerHTML = chrome.i18n.getMessage("donate1");
  document.getElementById("donate2").innerHTML = chrome.i18n.getMessage("donate2");
  document.getElementById("donate3").innerHTML = chrome.i18n.getMessage("donate3");
  document.getElementById("donatebtn").innerHTML = chrome.i18n.getMessage("donatebtn");
  document.getElementById("dontdonate").innerHTML = chrome.i18n.getMessage("dontdonate");
}

function collapseAll() {
  document.getElementById("collapseAll").innerText = chrome.i18n.getMessage("popup_expandAll");
  var wordlists = document.getElementsByClassName("wordlist");
  for (var i = 0; i < wordlists.length; i++) {
    wordlists[i].style.display = "none";
  }
  Collapsed=true;
}

function expandAll() {
  document.getElementById("collapseAll").innerText = chrome.i18n.getMessage("popup_collapseAll");
  var wordlists = document.getElementsByClassName("wordlist");
  for (var i = 0; i < wordlists.length; i++) {
    wordlists[i].style.display = "block";
  }
  Collapsed=false;
}


function switchTab(evt, tabName, group) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName(group+" tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName(group+" tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

function importFromFile() {
  window.alert("import");
}

function exportToFile() {
  var date = new Date();
  var day = ("0"+date.getDate()).slice(-2);
  var monthIndex = ("0"+(date.getMonth()+1)).slice(-2);
  var year = date.getFullYear();


  downloadFileFromText('HighlightThis'+year+monthIndex+day, JSON.stringify(HighlightsData));
}

function showWordsFound(inState) {
  debug && console.log("show words found", inState);
  chrome.runtime.sendMessage({command: "showWordsFound", state: inState}, function (response) {
    if (!inState) {
      showConfig();
      drawInterface();
    }
    else {
      document.getElementById("wordDisplay").style.display = "none";
      onPage();
    }
  });
}

function setPrintHighlights(inState) {
  debug && console.log("set print highlights", inState);

  chrome.runtime.sendMessage({command: "setPrintHighlights", state: inState}, function (response) {
    if (!inState) {
      showConfig();
      drawInterface();
    }
    else {
      document.getElementById("wordDisplay").style.display = "none";
      onPage();
    }
  });
}

function browseHighlight() {
  debug && console.log("Browse highlight");

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: "ScrollHighlight"});
  });
}

function syncList(){
  debug && console.log("Sync list");

  chrome.runtime.sendMessage({command: "syncList",group: document.getElementById("group").value}, function (response) {
    document.getElementById("syncLink").innerHTML=chrome.i18n.getMessage("synchronizing");
  });


}

function onPage() {
  onPageShown = true;
  // if (chrome.extension.getBackgroundPage().showFoundWords) {
  //   chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
  //     debug && console.log("active tabs",tabs);
  //     chrome.tabs.sendMessage(tabs[0].id, {command: "getMarkers"}, function (result) {
  //       debug && console.log("got markers",result);
  //
  //       if (result == undefined) {
  //         //on a chrome page
  //         drawInterface();
  //       }
  //       else if (result[0] != undefined) {
  //         document.getElementById("menu").style.display = "none";
  //         document.getElementById("onPage").style.display = "block";
  //         chrome.runtime.getPlatformInfo(
  //           function (i) {
  //
  //             if (i.os == "mac") {
  //               document.getElementById("OSKey").innerHTML = "Command";
  //             }
  //             else {
  //               document.getElementById("OSKey").innerHTML = "Control";
  //             }
  //           });
  //         renderFoundWords(result);
  //       }
  //       else {
  //         drawInterface();
  //       }
  //     });
  //   });
  // }
  // else {
    drawInterface();
  // }
}

function renderFoundWords(markers) {
  html = "";
  wordsFound = {};

  for (marker in markers) {
    if (wordsFound[markers[marker].word]) {
      wordsFound[markers[marker].word] += 1;
    }
    else {
      wordsFound[markers[marker].word] = 1;
    }
  }

  for (wordfound in wordsFound) {
    html += "<tr><td style='min-width:100px;'>" + wordfound + "</td><td>" + wordsFound[wordfound] + "</td></tr>";
  }
  document.getElementById("wordsfound").innerHTML = html;
}


function setLimits() {
  document.getElementById("secondScreen").style.display = "block";
  document.getElementById("firstScreen").style.display = "none";
}

function backToFirstScreen() {
  document.getElementById("secondScreen").style.display = "none";

  document.getElementById("firstScreen").style.display = "block";
}

function showSettings() {
  // document.getElementById("showFoundWords").checked=chrome.extension.getBackgroundPage().HighlightsData.ShowFoundWords;
  document.getElementById("printHighlights").checked=chrome.extension.getBackgroundPage().HighlightsData.PrintHighlights;
  // if(HighlightsData.neverHighlightOn && HighlightsData.neverHighlightOn.length>0){
  //   document.getElementById("neverHighlightOn").value=chrome.extension.getBackgroundPage().HighlightsData.neverHighlightOn.join("\n");
  // }
  document.getElementById("wordDisplay").style.display = "none";
  document.getElementById("onPage").style.display = "none";

  document.getElementById("menu").style.display = "none";
  document.getElementById("secondScreen").style.display = "none";
  document.getElementById("firstScreen").style.display = "none";
  document.getElementById("newGroup").style.display = "none";
  document.getElementById("newGroupType").style.display = "none";
  document.getElementById("deleteGroup").style.display = "none";
  document.getElementById("settingsGroup").style.display = "block";
}

// function showDonate() {
//   /*document.getElementById("showFoundWords").checked=chrome.extension.getBackgroundPage().HighlightsData.ShowFoundWords;
//     document.getElementById("neverHighlightOn").value=chrome.extension.getBackgroundPage().HighlightsData.neverHighlightOn.join("\n");*/
//   document.getElementById("wordDisplay").style.display = "none";
//   document.getElementById("menu").style.display = "none";
//
//   document.getElementById("donateGroup").style.display = "block";
// }


function cancelSettings(){
  document.getElementById("settingsGroup").style.display = "none";
  document.getElementById("wordDisplay").style.display = "block";
  document.getElementById("menu").style.display = "block  ";

}
function showConfig() {
  document.getElementById("onPage").style.display = "none";

  document.getElementById("wordDisplay").style.display = "block";

  document.getElementById("menu").style.display = "block  ";
}
function deleteGroup() {
  var groupToDelete = document.getElementById("editWordsGroupName").value;
  document.getElementById("newGroup").style.display = "none";
  document.getElementById("deleteGroupName").innerHTML = groupToDelete;
  document.getElementById("wordDisplay").style.display = "none";
  document.getElementById("menu").style.display = "none";
  document.getElementById("deleteGroup").style.display = "block";
}

function yesDeleteGroup() {
  var group = document.getElementById("deleteGroupName").innerHTML;
  debug && console.log("yes delete group");

  chrome.runtime.sendMessage({command: "deleteGroup", group: group}, function (response) {
    setTimeout(function () {
      drawInterface();
    }, 1000);
  });

  document.getElementById("wordDisplay").style.display = "block";
  document.getElementById("menu").style.display = "block  ";
  document.getElementById("deleteGroup").style.display = "none";
}


function noDeleteGroup() {
  document.getElementById("wordDisplay").style.display = "block";
  document.getElementById("menu").style.display = "block  ";
  document.getElementById("deleteGroup").style.display = "none";
}

function saveSettings(){
  showWordsFound(document.getElementById("showFoundWords").checked);
  setPrintHighlights(document.getElementById("printHighlights").checked);
  // var neverHighlightOnSites = document.getElementById("neverHighlightOn").value.split("\n").filter(function (e) {
  //   return e
  // });
  // var cleanNeverHighlightOnSites=[];
  // if(neverHighlightOnSites.length>0){
  //   neverHighlightOnSites.forEach(function(item) {
  //     cleanNeverHighlightOnSites.push( item.replace(/(http|https):\/\//gi, ""));
  //   });
  // }

  // chrome.extension.getBackgroundPage().setNeverHighligthOn(cleanNeverHighlightOnSites);

  cancelSettings();
}

function addGroup() {
  //backToFirstScreen();
  document.getElementById("deleteButton").style.display = "none";
  document.getElementById("wordDisplay").style.display = "none";
  document.getElementById("menu").style.display = "none";
  document.getElementById("newGroup").style.display = "none";
  document.getElementById("newGroupType").style.display = "block";
}

function createGroup() {
  document.getElementById("groupForm").reset();
  var listTypes = document.getElementsByName("type");
  var listType;

  for(var i = 0; i < listTypes.length; i++) {
    if(listTypes[i].checked) {listType = listTypes[i].value;}
  }
  document.getElementById("field_listType").value=listType;
  switch(listType){
  case "local":
    document.getElementById("words").readOnly=false;
    document.getElementById("words").style.dispay="block";
    document.getElementById("regexSection").style.display="none";
    document.getElementById("words").className="";
    document.getElementById("extSource").style.display = "none";
    break;
  case "remote":
    document.getElementById("regexSection").style.display="none";
    document.getElementById("words").readOnly=true;
    document.getElementById("words").className="disabledWords";
    document.getElementById("extSource").style.display = "table-row";
    document.getElementById("field_remoteType").value="web";
    document.getElementById("pastbinAttributes").style.display="none";
    document.getElementById("webAttributes").style.display="block";
    break;
  case "regex":
    document.getElementById("regexSection").style.dispay="block";
    document.getElementById("extSource").style.display = "none";
    document.getElementById("wordSection").style.display="none";

    break;
  }

  drawColorSelector("groupColorSelector", "#ff6");
  drawColorSelector("groupFColorSelector", "", "fcolor");
  document.getElementById("syncLink").style.display="none";
  document.getElementById("example").style.backgroundColor = "#ff6";
  document.getElementById("example").style.color = "#000";
  document.getElementById("groupFormTitle").innerHTML = chrome.i18n.getMessage("popup_createWordList");
  document.getElementById("formSubmitButton").value = chrome.i18n.getMessage("popup_add");
  document.getElementById("editWordsGroupName").value = "";
  hintNonUnicodeChar("");

  //backToFirstScreen();
  document.getElementById("deleteButton").style.display = "none";
  document.getElementById("wordDisplay").style.display = "none";
  document.getElementById("newGroupType").style.display = "none";
  document.getElementById("menu").style.display = "none";
  document.getElementById("newGroup").style.display = "block";
}

function cancelAddGroup() {
  document.getElementById("editWordsGroupName").value = "";
  document.getElementById("wordDisplay").style.display = "block";

  document.getElementById("menu").style.display = "block  ";

  document.getElementById("newGroup").style.display = "none";
  document.getElementById("newGroupType").style.display = "none";
}

function flipGroup(inGroup, inAction) {
  debug && console.log("flip group");

  chrome.runtime.sendMessage({command: "flipGroup", group: inGroup, action: inAction}, function (response) {
    setTimeout(function () {
      drawInterface();
    }, 1000);
  });
}

function editGroup(inGroup) {
  var wordsText = "";



  document.getElementById("highlightOnSites").value = HighlightsData.Groups[inGroup].ShowOn.join("\n");
  document.getElementById("dontHighlightOnSites").value = HighlightsData.Groups[inGroup].DontShowOn.join("\n");
  drawColorSelector("groupColorSelector", HighlightsData.Groups[inGroup].Color);
  drawColorSelector("groupFColorSelector", HighlightsData.Groups[inGroup].Fcolor || '#000', "fcolor");
  wordsText=HighlightsData.Groups[inGroup].Words.join("\n");
  /*for (word in HighlightsData.Groups[inGroup].Words) {
        wordsText = wordsText + HighlightsData.Groups[inGroup].Words[word] + "\n";
    }*/
  document.getElementById("example").style.backgroundColor = HighlightsData.Groups[inGroup].Color;
  document.getElementById("example").style.color = HighlightsData.Groups[inGroup].Fcolor || '#000';
  document.getElementById("formSubmitButton").value = chrome.i18n.getMessage("popup_save");
  document.getElementById("group").value = inGroup;
  document.getElementById("editWordsGroupName").value = inGroup;
  document.getElementById("groupFormTitle").innerHTML = chrome.i18n.getMessage("popup_editWordlist") + " " + inGroup;

  //external lists
  document.getElementById("field_listType").value= HighlightsData.Groups[inGroup].Type;

  switch(HighlightsData.Groups[inGroup].Type){
  case "remote":
    document.getElementById("regexSection").style.display="none";
    document.getElementById("wordsSection").style.display="block";

    document.getElementById("words").readOnly=true;
    document.getElementById("words").className="disabledWords";
    document.getElementById("syncLink").style.display="inline";
    document.getElementById("extSource").style.display = "table-row";
    document.getElementById("field_remoteType").value=HighlightsData.Groups[inGroup].RemoteConfig.type;
    switch(HighlightsData.Groups[inGroup].RemoteConfig.type){
    case 'pastebin':
      document.getElementById("pastebinId").value=HighlightsData.Groups[inGroup].RemoteConfig.id;
      document.getElementById("webAttributes").style.display="none";
      document.getElementById("pastbinAttributes").style.display="block";

      break;
    case 'web':
      document.getElementById("remoteWebUrl").value=HighlightsData.Groups[inGroup].RemoteConfig.url;

      document.getElementById("webAttributes").style.display="block";
      document.getElementById("pastbinAttributes").style.display="none";
      break;
    default:
    }
    break;
  case "regex":
    document.getElementById("regexSection").style.dispay="table-row";
    document.getElementById("extSource").style.display = "none";
    document.getElementById("wordsSection").style.display="none";
    document.getElementById("regex").value=HighlightsData.Groups[inGroup].Regex;
    break;
  default:
    document.getElementById("wordsSection").style.display="block";
    document.getElementById("regexSection").style.display="none";
    document.getElementById("words").readOnly=false;
    document.getElementById("words").className="";
    document.getElementById("syncLink").style.display="none";
    document.getElementById("extSource").style.display = "none";
  }

  backToFirstScreen();
  document.getElementById("deleteButton").style.display = "block";
  document.getElementById("findwords").checked = HighlightsData.Groups[inGroup].FindWords;
  document.getElementById("showInEditableFields").checked = HighlightsData.Groups[inGroup].ShowInEditableFields;
  document.getElementById("words").value = wordsText;
  hintNonUnicodeChar(wordsText);
  document.getElementById("wordDisplay").style.display = "none";
  document.getElementById("menu").style.display = "none";
  document.getElementById("newGroup").style.display = "block";
}


function cancelEditGroup() {
  document.getElementById("editGroupColorSelector").innerHTML = "";
  document.getElementById("editGroupFColorSelector").innerHTML = "";

  document.getElementById("wordDisplay").style.display = "block";
  document.getElementById("menu").style.display = "block  ";
  document.getElementById("editWords").style.display = "none";
}


function submitGroup() {
  var group = document.getElementById("editWordsGroupName").value;
  var newName = document.getElementById("group").value;

  if (group!=newName||newName==''){
    //check if there is no duplicate group name
    while (HighlightsData.Groups[newName]!=undefined || newName==''){
      newName+=1;
    }
  }
  var color = document.getElementById("color").value;
  var fcolor = document.getElementById("fcolor").value;
  var findwords = document.getElementById("findwords").checked;
  var showInEditableFields = document.getElementById("showInEditableFields").checked;
  var groupType=document.getElementById("field_listType").value;
  var remoteConfig={};
  if (groupType=='remote'){
    remoteType=document.getElementById("field_remoteType").value;
    switch(remoteType){
    case 'pastebin':
      remoteConfig={'type':'pastebin', 'id':document.getElementById("pastebinId").value};
      break;
    case 'web':
      remoteConfig={'type':'web', 'url':document.getElementById("remoteWebUrl").value};
      break;
    default:
    }
  }
  if (groupType=='regex'){
    var regexString=document.getElementById("regex").value;
  }
  else {
    var regexString=null;
  }

  document.getElementById("groupColorSelector").innerHTML = "";
  var words = document.getElementById("words").value;
  wordsToAdd = words.split("\n").filter(function (e) {
    return e
  });

  highlightOnSites = document.getElementById("highlightOnSites").value.split("\n").filter(function (e) {
    return e
  });
  dontHighlightOnSites = document.getElementById("dontHighlightOnSites").value.split("\n").filter(function (e) {
    return e
  });

  var cleanHighLigthOnSites=[]; var cleanDontHighLigthOnSites=[];
  highlightOnSites.forEach(function(item) {
    //if (item.search(/[\/\*]/gi)==-1) {item=item+"/*";}
    cleanHighLigthOnSites.push( item.replace(/(http|https):\/\//gi, ""));
  });

  dontHighlightOnSites.forEach(function(item) {
    //if (item.search(/[\/\*]/gi)==-1) {item=item+"/*";}
    cleanDontHighLigthOnSites.push( item.replace(/(http|https):\/\//gi, ""));
  });


  if (group != "") {
    debug && console.log("before set words");

    chrome.runtime.sendMessage({
      command: "setWords",
      words: wordsToAdd,
      group: group,
      color: color,
      fcolor: fcolor,
      regex: regexString,
      findwords: findwords,
      showInEditableFields: showInEditableFields,
      showon: cleanHighLigthOnSites,
      dontshowon: cleanDontHighLigthOnSites,
      groupType: groupType,
      remoteConfig:remoteConfig,
      newname: newName
    }, function (response) {
      setTimeout(function () {

        drawInterface();
        document.getElementById("wordDisplay").style.display = "block";
        document.getElementById("menu").style.display = "block";
      }, 1000);
    });
  }
  else {
    debug && console.log("Before add group");

    chrome.runtime.sendMessage({
      command: "addGroup",
      group: newName,
      color: color,
      fcolor: fcolor,
      regex: regexString,
      findwords: findwords,
      showInEditableFields: showInEditableFields,
      showon: cleanHighLigthOnSites,
      dontshowon: cleanDontHighLigthOnSites,
      groupType: groupType,
      remoteConfig:remoteConfig,
      words: wordsToAdd
    }, function (response) {
      setTimeout(function () {

        drawInterface();
        document.getElementById("wordDisplay").style.display = "block";
        document.getElementById("menu").style.display = "block";
      }, 1000);
    });
  }
  clearHighlightsFromTab();
}

function onOff() {
  if (chrome.extension.getBackgroundPage().highlighterEnabled) {
    chrome.extension.getBackgroundPage().highlighterEnabled = false;
  }
  else {
    chrome.extension.getBackgroundPage().highlighterEnabled = true;
  }
  renderOnOff();
}

function renderOnOff() {
  document.getElementById('myonoffswitch').checked = chrome.extension.getBackgroundPage().highlighterEnabled;
  if (!chrome.extension.getBackgroundPage().highlighterEnabled) {
    document.getElementById('header').style.backgroundColor = "grey";
  }
  else {
    document.getElementById('offDesc').innerHTML = "";
    document.getElementById('header').style.backgroundColor = "#0091EA";
  }
}

function clearHighlightsFromTab() {
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    debug&&("clearing highlights from tab");
    chrome.tabs.sendMessage(tabs[0].id, {command: "ClearHighlights"});
  });
}

function drawInterface() {
  HighlightsData = JSON.parse(localStorage["HighlightsData"]);
  var htmlContent = "";
  var groupNumber = 0;
  var linkNumber = 0;
  var arrGroups = Object.keys(HighlightsData.Groups).map(function(k) { return k});
  arrGroups.sort();
  //for (group in HighlightsData.Groups) {
  var groupix;
  for (groupix in arrGroups){
    group=arrGroups[groupix];
    htmlContent += '<div class="wordListContainer" groupname="'+group+'">';
    if (HighlightsData.Groups[group].Enabled) {
      htmlContent += '<div class="groupTitle" id="groupHeader' + groupNumber + '"><div class="groupColor" style="background-color:' + HighlightsData.Groups[group].Color + '; color:' + HighlightsData.Groups[group].Fcolor + ';">' + group.substr(0, 1) + '</div><div class="groupHeader">' + group + '</div></div>';
    }
    else {
      htmlContent += '<div class="groupTitle" id="groupHeader' + groupNumber + '"><div class="groupColor" style=" background-color: #ccc;color:#fff;">' + group.substr(0, 1) + '</div><div class="groupHeader groupDisabled">' + group + '</div></div>';
    }
    if (HighlightsData.Groups[group].ShowOn.length > 0||HighlightsData.Groups[group].DontShowOn.length > 0) {
      htmlContent += '<span style="margin-left: 5px;">('+chrome.i18n.getMessage("popup_limitations")+')</span>';
    }
    if (HighlightsData.Groups[group].Enabled) {
      htmlContent += '<a id="flipGroup' + groupNumber + '" class="flipGroup" tooltip="Disable group" group="' + group + '" action="disable" ><i class="fa fa-pause" aria-hidden="true"></i></a>';
    }
    else {
      htmlContent += '<a id="flipGroup' + groupNumber + '" class="flipGroup" tooltip="Enable group" group="' + group + '" action="enable" ><i class="fa fa-play" aria-hidden="true"></i></a>';
    }

    htmlContent += '<a id="editGroup' + groupNumber + '" class="editGroup" tooltip="Edit group" group="' + group + '"  ><i class="fa fa-pencil" aria-hidden="true"></i></a>';




    htmlContent += '<div class="clearfix"></div><ul id="wordList' + groupNumber + '" class="wordlist">';
    for (word in HighlightsData.Groups[group].Words) {
      htmlContent += '<li>' + HighlightsData.Groups[group].Words[word] + '</li>';
    }
    htmlContent += '</ul>';
    htmlContent += '</div>';
    groupNumber += 1;
  }
  if (groupNumber == 0) {
    document.getElementById("intro").style.display = "block";
    document.getElementById("wordlistmenu").style.display = "none";
  }
  else {
    document.getElementById("intro").style.display = "none";
    document.getElementById("wordlistmenu").style.display = "block";

  }

  htmlContent += '<div style="text-align: center;width: 100%;position: fixed;bottom: 0px;background: white;"></div>' //<a id="settingsLink" class="secondaryLink" style="    ">'+chrome.i18n.getMessage("popup_settings")+'</a></div>';

  document.getElementById('wordData').innerHTML = htmlContent;
  if (Collapsed) {
    collapseAll();
  }
  else {
    expandAll();
  }

  for (var i = 0; i < groupNumber; i++) {
    var editGroupId = "editGroup" + i;
    var flipGroupId = "flipGroup" + i;
    var groupHeaderId = "groupHeader" + i;

    document.getElementById(editGroupId).addEventListener('click', function () {
      editGroup(this.getAttribute("group"));
      return false;
    });
    document.getElementById(flipGroupId).addEventListener('click', function () {
      flipGroup(this.getAttribute("group"), this.getAttribute("action"));
      return false;
    });
    document.getElementById(groupHeaderId).addEventListener('click',function(e){
      if(e.srcElement.parentElement.parentElement.childNodes[4].style.display=="block"){
        e.srcElement.parentElement.parentElement.childNodes[4].style.display="none";
      }
      else {
        e.srcElement.parentElement.parentElement.childNodes[4].style.display="block";
      }
      return false
    })

  }
  renderOnOff();

}

function filterWords(infilter){
  //wordListContainer
  var groupsToShow=[];
  var showGroup=false;
  var searchExp=new RegExp(infilter,'gi');
  if (infilter.length>0) {
    for (group in HighlightsData.Groups) {

      showGroup = false;
      if(group.match(searchExp)){
        showGroup = true;
      }
      else {
        for (word in HighlightsData.Groups[group].Words) {
          if (HighlightsData.Groups[group].Words[word].match(searchExp)) {
            showGroup = true;
          }
        }
      }
      if (showGroup) {
        groupsToShow.push(group);
      }
    }

  }
  else {groupsToShow=Object.keys(HighlightsData.Groups);}

  allGroups=document.getElementsByClassName("wordListContainer");


  for( var group = 0; group < allGroups.length; group++) {
    if(groupsToShow.indexOf(allGroups[group].getAttribute("groupname"))>-1){
      allGroups[group].style.display="block";
    }
    else{
      allGroups[group].style.display="none";
    }

  }
}

function setColor(colorSelected, colorSet) {
  document.getElementById(colorSet).value = colorSelected.attributes["ColorValue"].value;
  colorElements = document.getElementById(colorSet + "list").getElementsByClassName("color")
  //colorElements=document.getElementsByClassName('color');
  for (var i = 0; i < colorElements.length; i++) {
    colorElements[i].className = "color";
  }
  colorSelected.className += ' selected';
  /*
    if (colorSet == "fcolor") {
        document.getElementById('example').style.color = colorSelected.attributes["ColorValue"].value;
    }
    else {
        document.getElementById('example').style.backgroundColor = colorSelected.attributes["ColorValue"].value;
    }*/
  renderColorExample();
}

function renderColorExample(){

  document.getElementById('example').style.color = document.getElementById("fcolor").value;
  document.getElementById('example').style.backgroundColor = document.getElementById("color").value;

}

function drawColorSelector(target, defaultColor, colorSet) {
  var colors;
  if (colorSet == "fcolor") {
    colors = FColors;
  } else {
    colors = Colors;
    colorSet = "color"
  }
  var htmlContent = '<ul id="' + colorSet + 'list" class="colorsList">';
  if (defaultColor == "") {
    htmlContent += '<li class="color selected" colorValue="" style="color:red; text-align:center;">x</li>';
  }
  else {
    htmlContent += '<li class="color" colorValue="" style="color:red; text-align:center;">x</li>';
  }
  var color;

  for (color in colors) {
    if (colors[color] == defaultColor) {
      htmlContent += '<li class="color selected" colorValue="' + colors[color] + '" style="background-color:' + colors[color] + '; "></li>';
    }
    else {
      htmlContent += '<li class="color" colorValue="' + colors[color] + '" style="background-color:' + colors[color] + '; "></li>';
    }
  }
  htmlContent += '</ul><input id="' + colorSet + '" style="margin-left:10px;max-width:60px;" placeholder="html color code e.g. #e5e5e5" value="' + defaultColor + '">';

  document.getElementById(target).innerHTML = htmlContent;
  var colorelements = document.getElementById(colorSet + "list").getElementsByClassName("color");
  document.getElementById(colorSet).addEventListener('change', function(){renderColorExample();});
  for (var i = 0; i < colorelements.length; i++) {
    colorelements[i].addEventListener('click', function () {
      setColor(this, colorSet);
      return false;
    });
  }

}


function downloadFileFromText(filename, content) {


  var blob = new Blob([content], {type : "text/plain;charset=UTF-8"});
  url = window.URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: filename
  })


}

function startRead(evt) {
  var file = document.getElementById('importFile').files[0];
  if (file) {
    console.log(getAsText(file));
  }
}

function getAsText(readFile) {

  var reader = new FileReader();

  // Read file into memory as UTF-8
  reader.readAsText(readFile, "UTF-8");
  reader.onload = loaded;
}

function loaded(evt) {
  // Obtain the read file data
  var fileString = evt.target.result;

  if(!chrome.extension.getBackgroundPage().importFile(fileString)){
    document.getElementById('importError').innerText=chrome.i18n.getMessage("popup_importFailed");
  }
  else {
    drawInterface();
    cancelSettings();
  }
}
