/* global $ */
/* global chrome */
// var onPageShown = false;
var debug=false;
const removeEditText = 'Remove Edit Panel From This Tab';
const openEditText = 'Open Edit Panel for this Tab';
const highlightThisText = 'Highlight Candidates on This Tab';
const removeHighlightThisText = 'Remove Highlights From This Tab';

console.log('onPage localStorage[enabledURLsData]: ', localStorage['enabledURLsData']);

document.addEventListener('DOMContentLoaded', function () {
  let highlightingEnabled = false;
  let highlightCandidatesOnAllTabs = localStorage['highlightCandidatesOnAllTabs'] === 'true';
  dumpTabStatus();

  console.log('chrome.extension.getBackgroundPage().highlighterEnabled: ' + chrome.extension.getBackgroundPage().highlighterEnabled);
  // console.log('localStorage[\'highlightCandidatesOnThisTab\']', localStorage['highlightCandidatesOnThisTab']);
  console.log('localStorage[\'highlightCandidatesOnAllTabs\']', localStorage['highlightCandidatesOnAllTabs']);
  if (chrome.extension.getBackgroundPage().highlighterEnabled === undefined) {
    chrome.extension.getBackgroundPage().highlighterEnabled = false;
    localStorage['highlightCandidatesOnAllTabs'] = 'false';
  } else {
    highlightingEnabled = chrome.extension.getBackgroundPage().highlighterEnabled;
    highlightCandidatesOnAllTabs = localStorage['highlightCandidatesOnAllTabs'] === 'true';
  }

  updateButtonState();

  // Master switch "Enable Highlighting"
  $('#highlightingMasterSwitch').prop('checked', highlightingEnabled).click(() => {
    // We are turning off or turning on we want to reset the two bottom buttons
    $('#highlightCandidatesThisTabSwitch').removeClass('weButtonRemove').text(highlightThisText);
    $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);

    // If after the click the switch is now checked (flipped to right)...
    if ($('#highlightingMasterSwitch').is(':checked')) {
      chrome.extension.getBackgroundPage().highlighterEnabled = true;
    } else {
      chrome.extension.getBackgroundPage().highlighterEnabled = false;
      chrome.extension.getBackgroundPage().enableHighlightsForAllTabs(false);

      localStorage['highlightCandidatesOnAllTabs'] = 'false';
      $('#highlightCandidatesOnAllTabsSwitch').prop('checked', false);
    }
  });

  // Not yet tested
  $('#highlightCandidatesOnAllTabsSwitch').prop('checked', highlightCandidatesOnAllTabs).click(() => {
    if ($('#highlightCandidatesOnAllTabsSwitch').is(':checked')) {
      $('#highlightingMasterSwitch').prop('checked', true);
      localStorage['highlightCandidatesOnAllTabs'] = 'true';
      chrome.extension.getBackgroundPage().highlighterEnabled = true;
      chrome.extension.getBackgroundPage().enableHighlightsForAllTabs(true);
    } else {
      chrome.extension.getBackgroundPage().enableHighlightsForAllTabs(false);
      localStorage['highlightCandidatesOnAllTabs'] = 'false';
    }
  });

  $('#highlightCandidatesThisTabSwitch').click((event) => {
    chrome.extension.getBackgroundPage().highlighterEnabled = true;
    $('#highlightingMasterSwitch').prop('checked', true);

    let enable = true;
    // Need enable/disable logic here
    if ($('#highlightCandidatesThisTabSwitch').hasClass('weButtonRemove')) {  // if pressing the button would do a remove...
      $('#highlightCandidatesThisTabSwitch').removeClass('weButtonRemove').text(highlightThisText);
      enable = false;
    } else {
      $('#highlightCandidatesThisTabSwitch').addClass('weButtonRemove').text(removeHighlightThisText);
      enable = true;
    }

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      console.log('enabling highlights on active tab -- popup.js tab.id: ' + tabs[0].id);
      const showEditMenu = false;
      chrome.extension.getBackgroundPage().setEnableForActiveTab(enable, showEditMenu, tabs[0]);
    });
    event.timer = setTimeout(() => {
      window.close();
    }, 1000);
  });

  $('#openEditPanelButton').click((event) => {
    chrome.extension.getBackgroundPage().highlighterEnabled = true;
    console.log('openEditPanelButton button onClick -- popup.js');
    $('#highlightingMasterSwitch').prop('checked', true);

    let enable = true;
    // Need enable/disable logic here
    if ($('#openEditPanelButton').hasClass('weButtonRemove')) {  // if pressing the button would do a remove...
      $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);
      enable = false;
    } else {
      $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);
      enable = true;
    }

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      console.log('enabling editor on active tab from openEditPanelButton button -- popup.js tab.id: ' + tabs[0].id);
      chrome.extension.getBackgroundPage().setEnableForActiveTab(enable, enable, tabs[0]);
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

function updateButtonState () {
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: 'getTabStatusValues'}, function (result){
      debug && console.log('getCurrentTabStatus() result: ', result);
      if(result){
        let {highlighterEnabledThisTab, editorEnabledThisTab} = result;
        if (highlighterEnabledThisTab) {
          $('#highlightCandidatesThisTabSwitch').addClass('weButtonRemove').text(removeHighlightThisText);
        } else {
          $('#highlightCandidatesThisTabSwitch').removeClass('weButtonRemove').text(highlightThisText);
        }

        if (editorEnabledThisTab) {
          $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);
        } else {
          $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);
        }
      }
    });
  });
}

function dumpTabStatus () {
  chrome.tabs.getAllInWindow(null, function (tabs) {
    for (let i = 0; i < tabs.length; i++) {
      const { id: tabId, url } = tabs[i];
      chrome.tabs.sendMessage(tabId, {command: 'getTabStatusValues'}, function (result){
        if (result) {
          const {highlighterEnabledThisTab, editorEnabledThisTab} = result;
          console.log('dumpTabStatus tabId: ' + tabId + ', highlight: ' + highlighterEnabledThisTab  + ', editor: ' + editorEnabledThisTab + ', url: ' + url);
        } else {
          console.log('dumpTabStatus NO RESULT tabId: ' + tabId + ', highlight: ' + highlighterEnabledThisTab  + ', editor: ' + editorEnabledThisTab + ', url: ' + url);
        }
      });
    }

  });

}

function clearHighlightsFromTab () {
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    debug&&('clearing highlights from tab');
    chrome.tabs.sendMessage(tabs[0].id, {command: 'ClearHighlights'});
  });
}

// function onOff () {
//   if (chrome.extension.getBackgroundPage().highlighterEnabled) {
//     chrome.extension.getBackgroundPage().highlighterEnabled = false;
//   }
//   else {
//     chrome.extension.getBackgroundPage().highlighterEnabled = true;
//   }
//   renderOnOff();
// }
//
// function renderOnOff () {
//   document.getElementById('myonoffswitch').checked = chrome.extension.getBackgroundPage().highlighterEnabled;
//   if (!chrome.extension.getBackgroundPage().highlighterEnabled) {
//     document.getElementById('header').style.backgroundColor = 'grey';
//   }
//   else {
//     document.getElementById('offDesc').innerHTML = '';
//     document.getElementById('header').style.backgroundColor = '#0091EA';
//   }
// }

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

