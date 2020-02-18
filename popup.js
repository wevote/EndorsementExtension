/* global $ */
// var Colors = ["#fff", "#000", "#ff6", "#a0ffff", "#0DD5FC", "#9f9", "#3DFF33", "#FF9933", "#f99", "#f6f"];
// var FColors = ["#fff", "#000", "#ff6", "#a0ffff", "#0DD5FC", "#9f9", "#3DFF33", "#FF9933", "#f99", "#f6f"];
var onPageShown = false;
// var Collapsed=true;
// var enableSaveButton=false;
var debug=false;
// var HighlightsData = JSON.parse(localStorage['HighlightsData']);
// var wordsToAdd = [];
// const useProductionAPIs = true;
// const rootApiURL = useProductionAPIs ? 'https://api.wevoteusa.org/apis/v1' : 'http://127.0.0.1:8000/apis/v1';

console.log('onPage localStorage[enabledURLsData]: ', localStorage['enabledURLsData']);

document.addEventListener('DOMContentLoaded', function () {
  let highlightingEnabled = false;
  let highlightCandidatesOnThisTab = false;
  let highlightCandidatesOnAllTabs = false;
  let editPanelOpenOnThisTab = false;

  // chrome.extension.getBackgroundPage().highlighterEnabled = true;
  // console.log('localStorage[\'highlightingEnabled\'] 11111 ', chrome.extension.getBackgroundPage().highlighterEnabled);
  // chrome.extension.getBackgroundPage().highlighterEnabled = false;
  console.log('chrome.extension.getBackgroundPage().highlighterEnabled: ' + chrome.extension.getBackgroundPage().highlighterEnabled);
  console.log('localStorage[\'highlightCandidatesOnThisTab\']', localStorage['highlightCandidatesOnThisTab']);
  console.log('localStorage[\'highlightCandidatesOnAllTabs\']', localStorage['highlightCandidatesOnAllTabs']);
  if (chrome.extension.getBackgroundPage().highlighterEnabled === undefined) {
    chrome.extension.getBackgroundPage().highlighterEnabled = highlightingEnabled;
    localStorage['highlightCandidatesOnThisTab'] = highlightCandidatesOnThisTab;
    localStorage['highlightCandidatesOnAllTabs'] = highlightCandidatesOnAllTabs;
    localStorage['editPanelOpenOnThisTab'] = editPanelOpenOnThisTab;
  } else {
    highlightingEnabled = chrome.extension.getBackgroundPage().highlighterEnabled;
    highlightCandidatesOnThisTab = localStorage['highlightCandidatesOnThisTab'] === 'true';
    highlightCandidatesOnAllTabs = localStorage['highlightCandidatesOnAllTabs'] === 'true';
    editPanelOpenOnThisTab = localStorage['editPanelOpenOnThisTab'] === 'true';
  }

  $('#globalyEnableHighlightingSwitch').prop('checked', highlightingEnabled).click(() => {
    if ($('#globalyEnableHighlightingSwitch').is(':checked')) {
      chrome.extension.getBackgroundPage().highlighterEnabled = true;
      $('#globalyEnableHighlightingSwitch').prop('checked', true);
    } else {
      chrome.extension.getBackgroundPage().highlighterEnabled = false;
      $('#globalyEnableHighlightingSwitch').prop('checked', false);
      localStorage['highlightCandidatesOnThisTab'] = false;
      $('#highlightCandidatesThisTabSwitch').prop('checked', false);
      localStorage['highlightCandidatesOnAllTabs'] = false;
      $('#highlightCandidatesOnAllTabsSwitch').prop('checked', false);
    }
  });

  $('#highlightCandidatesThisTabSwitch').click((event) => {
    if (!chrome.extension.getBackgroundPage().highlighterEnabled) {
      chrome.extension.getBackgroundPage().highlighterEnabled = true;
    }
    $('#enableHighlightingSwitch').prop('checked', chrome.extension.getBackgroundPage().highlighterEnabled);
    // localStorage['highlightCandidatesOnThisTab'] = true;
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      console.log('enabling highlights on active tab -- popup.js tab.id: ' + tabs[0].id);
      const enable = true;
      const showEditMenu = false;
      chrome.extension.getBackgroundPage().setEnableForActiveTab(enable, showEditMenu, tabs[0]);
    });
    event.timer = setTimeout(() => {
      window.close();
    }, 1000);
  });

  $('#highlightCandidatesOnAllTabsSwitch').prop('checked', highlightCandidatesOnAllTabs).click(() => {
    if ($('#highlightCandidatesOnAllTabsSwitch').is(':checked')) {
      chrome.extension.getBackgroundPage().highlighterEnabled = true;
      $('#enableHighlightingSwitch').prop('checked', true);
      localStorage['highlightCandidatesOnAllTabs'] = true;
      $('#highlightCandidatesOnAllTabsSwitch').prop('checked', true);
    } else {
      localStorage['highlightCandidatesOnAllTabs'] = false;
      $('#highlightCandidatesOnAllTabsSwitch').prop('checked', false);
    }
  });

  $('#openEditPanelButton').click((event) => {
    console.log('openEditPanelButton button onClick -- popup.js');
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      console.log('enabling editor on active tab from openEditPanelButton button -- popup.js tab.id: ' + tabs[0].id);
      const enable = true;
      const showEditMenu = true;
      chrome.extension.getBackgroundPage().setEnableForActiveTab(enable, showEditMenu, tabs[0]);
    });
    event.timer = setTimeout(() => {
      window.close();
    }, 1000);
  });

  // if (onPageShown) {
  //   drawInterface();
  // }
  // else {
  //   onPage();
  // }
});

function onOff () {
  if (chrome.extension.getBackgroundPage().highlighterEnabled) {
    chrome.extension.getBackgroundPage().highlighterEnabled = false;
  }
  else {
    chrome.extension.getBackgroundPage().highlighterEnabled = true;
  }
  renderOnOff();
}

function renderOnOff () {
  document.getElementById('myonoffswitch').checked = chrome.extension.getBackgroundPage().highlighterEnabled;
  if (!chrome.extension.getBackgroundPage().highlighterEnabled) {
    document.getElementById('header').style.backgroundColor = 'grey';
  }
  else {
    document.getElementById('offDesc').innerHTML = '';
    document.getElementById('header').style.backgroundColor = '#0091EA';
  }
}

function clearHighlightsFromTab () {
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    debug&&('clearing highlights from tab');
    chrome.tabs.sendMessage(tabs[0].id, {command: 'ClearHighlights'});
  });
}

// function hintNonUnicodeChar (value){
//   if(value.match(/[^a-zA-Z0-9_\s]/)){
//     document.getElementById('hintNonUnicode').style.display='block';
//   }
//   else{
//     document.getElementById('hintNonUnicode').style.display='none';
//   }
// }

// function onPage () {
//   onPageShown = true;
//   if (chrome.extension.getBackgroundPage().showFoundWords) {
//     chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
//       debug && console.log("active tabs",tabs);
//       chrome.tabs.sendMessage(tabs[0].id, {command: "getMarkers"}, function (result) {
//         debug && console.log("got markers",result);
//
//         if (result == undefined) {
//           //on a chrome page
//           drawInterface();
//         }
//         else if (result[0] != undefined) {
//           document.getElementById("menu").style.display = "none";
//           document.getElementById("onPage").style.display = "block";
//           chrome.runtime.getPlatformInfo(
//             function (i) {
//
//               if (i.os == "mac") {
//                 document.getElementById("OSKey").innerHTML = "Command";
//               }
//               else {
//                 document.getElementById("OSKey").innerHTML = "Control";
//               }
//             });
//           renderFoundWords(result);
//         }
//         else {
//           drawInterface();
//         }
//       });
//     });
//   }
//   else {
//
//   localStorage['enabledURLsData'] = JSON.stringify([
//     'https://projects.sfchronicle.com/2018/voter-guide/endorsements-list/',
//     'https://www.sierraclub.org/ohio/2018-endorsements',
//     'https://www.cadem.org/vote/endorsements',
//     'https://www.sierraclub.org/california/2018-endorsements',
//     'https://www.eastbayexpress.com/oakland/our-november-2018-endorsement-guide/Content?oid=21443046'
//   ]);
//   console.log('onPage localStorage[enabledURLsData]: ', localStorage['enabledURLsData'])
//
//   drawInterface();
// }




// function drawInterface () {
//   HighlightsData = JSON.parse(localStorage['HighlightsData']);
//   enabledURLsData = JSON.parse(localStorage['enabledURLsData']);
//   console.log('enabledURLsData at drawInterface length: ' + enabledURLsData.length);
//
//   for(let i = 0; i < enabledURLsData.length; i++) {
//     let markup = '<tr>' +
//       '<td>' + enabledURLsData[i] + '</td>\n' +
//       '<td><button id="removeButton' + i + '">Remove</button></td>' +
//       '</tr>';
//     console.log('drawInterface markup: ' + markup);
//     $('#enabledURLs > tbody:last-child').append(markup);
//   }
//
//   $('[id^=removeButton]').on('click', function () {
//     // eslint-disable-next-line no-invalid-this
//     let {id} = this;
//     let index = id.substr('removeButton'.length);
//     removeFromEnabledURLs(index);
//   });
//
//   renderOnOff();
// }

// function removeFromEnabledURLs (index) {
//   const i = parseInt(index, 10);
//   console.log('STEVE STEVE STEVE removeFromEnabledURLs  index: ' + index)
//   let enabledURLsData = JSON.parse(localStorage['enabledURLsData']);
//   console.log('STEVE STEVE STEVE removeFromEnabledURLs  before: ', enabledURLsData)
//   let enabledURLsDataSmaller = enabledURLsData.splice(i);
//   console.log('STEVE STEVE STEVE removeFromEnabledURLs  after: ', enabledURLsDataSmaller)
//   localStorage['enabledURLsData'] = JSON.stringify(enabledURLsDataSmaller);
//   drawInterface();
// }

