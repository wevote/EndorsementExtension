const { $, chrome: { runtime } } = window;
const defaultImage = 'https://wevote.us/img/endorsement-extension/endorsement-icon48.png';
let state = {
  voterGuidePossibilityId: '',
  organizationWeVoteId: '',
  candidateName: '',
  allNames: '',
  possibleOrgsList: [],
  positionsCount: 0,
  voterWeVoteId: '',
};

/**
 * Display (or remove) the we vote extension UI
 * @param {boolean} enabled - true to display the UI, false to remove it
 * @returns {boolean} - return true to indicate that we call the response function asynchronously
 */
function displayWeVoteUI (enabled) {  // eslint-disable-line no-unused-vars
  try {
    if(enabled) {
      console.log('Displaying WeVote UI --------------------------------');
      getHighlights(true);   // Calls BuildUI when the API query completes
    } else {
      // Disable UI (reload the page)
      console.log('Unloading WeVote UI --------------------------------');
      location.reload();
    }
  } catch (err) {
    console.log('jQuery dialog in contentWeVoteUI threw: ', err);
  }
  return true;  // indicates that we call the response function asynchronously.  https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
}

function buildUI () {
  console.log('Building WeVote UI --------------------------------');
  let hr = window.location.href;
  let bod = $('body');
  $(bod).children().wrapAll("<div id='noDisplayPageBeforeFraming' >").hide();  // if you remove it, other js goes nuts
  $(bod).children().wrapAll("<div id='weContainer' >");  // Ends up before noDisplayPageBeforeFraming
  $('#noDisplayPageBeforeFraming').insertAfter('#weContainer');

  let weContainer = $('#weContainer');
  $(weContainer).append('' +
    "<span id='topMenu'>" +
    '</span>').append("<div id='weFlexBox' ></div>");

  let weFlexBox = $('#weFlexBox');
  $(weFlexBox).append('<div id="frameDiv"><iframe id="frame" width="100%" ></iframe></div>');
  $(weFlexBox).append('<div id="sideArea"></div>');
  $('#frame').attr('src', hr);
  topMenu();
  updateTopMenu();
  signIn(false);                       // Calls updatePositionsPanel
  initializeOrgChoiceList();           //  Does not display org choice list if not logged in, or have chosen an org
  greyAllPositionPanes(false);
}

function initializeOrgChoiceList () {
  setTimeout(() => {
    if (state.voterWeVoteId.length) {
      if (state.possibleOrgsList.length) {
        orgChoiceDialog(state.possibleOrgsList)
      } else if (state.positionsCount === 0) {
        setSideAreaStatus('No Candidate endorsements have been captured yet.');
      }
    } else {
      setSideAreaStatus('You must be signed in to display Candidate information.');
    }
  }, 2000);  // Yuck! Time delays are always a last resort
}


function debugLog (...args) {
  const {debugLocal} = window;
  if (debugLocal) {
    console.log(...args);
  }
}

function debugWarn (...args) {
  const {debugLocal} = window;
  if (debugLocal) {
    console.log(...args);
  }
}

/*
  May 16, 2019
   For now if the API server gets swapped local/production you will need to get a new device ID.
  With the extension running, go to the wevote.us or localhost:3000 page, and open the popup, and press the login button.
  Then when you navigate to some endorsement page. the device id will become available in local storage.
  Sept 10, 2019, you may have to clear localStorage['voterDeviceId'].  You will have to be running a local webapp, which
  is pointed to a local python server, so that they all share a voterDeviceId.  If you have had a valid voterDeviceId
  in the past, you can get the most recent one form pgAdmin/voter_voterdevicelink and paste it into the value for
  voterDeviceId in the chrome-extension's DevTools Application tab.
 */

function signIn (showDialog) {
  debugLog('new signIn');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getVoterInfo',},
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getVoterInfo")', lastError.message);
      }
      const { success, error, err, voterName, photoURL, weVoteId, voterEmail } = response.data;
      state.voterWeVoteId = weVoteId || '';
      debugLog('signIn response: ', response);
      let voterInfo = {
        success: success,
        error: error,
        err: err,
        name: voterName,
        photo: (!photoURL || photoURL.length < 10) ? 'https://wevote.us/img/global/icons/avatar-generic.png' : photoURL,
        voterId: weVoteId,
        email: voterEmail
      };
      // Unfortunately /avatar-generic.png can't be "served" from the page, since file loading is relative to the endorsement page

      if (voterInfo.success) {
        $('#signIn').replaceWith(
          '<img id="signOut" class="gridSignInTop voterPhoto removeContentStyles" alt="candidateWe" src="' + voterInfo.photo + '" ' +
            'style="margin: 12px; width: 50px; height: 50px;" />');
        updatePositionsPanel();
        document.getElementById('signOut').addEventListener('click', function () {
          debugLog('Sign Out pressed');
          $('#furlable-2').removeAttr('hidden');
          signOut();
          return false;
        });
      } else {
        console.warn('signIn() getVoterInfo returned error: ' + voterInfo.error + ', err: ' + voterInfo.err);
        if (showDialog) {
          $('#loginPopUp').dialog({
            dialogClass: 'no-close',
            width: 500,
            position: { my: 'right top', at: 'left bottom', of: '#signIn' },
            open: function () {
              const markup = "<div style='text-align: center;'><br><b>Authenticate this \"We Vote Endorsement Tool\" Chrome extension,</b><br>" +
                ' by logging into the We Vote WebApp (https://wevote.us) in another tab.<br><br>' +
                'Once you have logged into the We Vote Web App, ' +
                'navigate back to this tab and press the <b>SIGN IN</b> button again to authenticate the "We Vote Endorsement Tool" Chrome Extension.</div>';
              $(this).html(markup);
              setSideAreaStatus();
              setSideAreaStatus('No Candidate endorsements have been captured yet.');
              initializeOrgChoiceList();
            },
          });
        }
      }
    });
  return false;
}

function signOut () {
  console.log('signOut has not been implemented.');
}

function topMenu () {
  let topMarkup = '' +
    '<div id="topMenuContainer" class="topMenuContainer">' +
    '  <img id="orgLogo" class="gridOrgIcon" src="https://wevote.us/img/endorsement-extension/endorsement-icon48.png" alt="">' +
    '  <div id="orgName" class="gridOrgName core-text"></div>' +
    '  <span class="gridSend">' +
    '    <span class="innerGridSend core-text">' +
    '      <span class="topCommentLabel core-text">Send us a comment about this page: </span>' +
    '      <input type="text" id="emailWe" class="core-text" name="email" placeholder="Your email" >' +
    '      <input type="text" id="topComment" class="core-text"  sname="topComment" placeholder="Comment here..." >' +
    '      <button type="button" id="sendTopComment" class="sendTopComment weButton u2i-button u2i-widget u2i-corner-all removeContentStyles">Send</button>' +
    '    </span>' +
    '  </span>' +
    '  <button type="button" id="signIn" class="gridSignInTop  weButton removeContentStyles">SIGN IN</button>' +
    '  <span id="loginPopUp"></span>' +
    '  <div id="dlgAnchor"></div>' +
  '</div>';
  $('#topMenu').append(topMarkup);

  document.getElementById('signIn').addEventListener('click', function () {
    debugLog('Sign in pressed');
    signIn(true);
    return false;
  });
}

// Get the href into the extension
function getHighlights (doBuildUI) {
  debugLog('getHighlights() called');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getHighlights', url: window.location.href, doReHighlight: false },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getHighlights")', lastError.message);
      }
      debugLog('getHighlights() response', response);

      if (response) {
        debugLog('SUCCESS: getHighlights received a response', response);
        if (doBuildUI) {
          buildUI();
        }
      } else {
        console.log('ERROR: getHighlights received empty response');
      }
    });
}

function getRefreshedHighlights () {
  debugLog('getRefreshedHighlights called');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getHighlights', url: window.location.href, doReHighlight: true },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getHighlights")', lastError.message);
      }
      console.log('getRefreshedHighlights() response', response);

      if (response) {
        debugLog('SUCCESS: getRefreshedHighlights received a response', response);
        console.log('getRefreshedHighlights reloading iframe[0]');
        // eslint-disable-next-line prefer-destructuring
        let frame = $('iframe')[0];
        frame.contentWindow.location.reload();
      } else {
        console.log('ERROR: getRefreshedHighlights received empty response');
      }
    });
}

// Call into the background script to do a voterGuidePossibilityRetrieve() api call, and return the data, then update the top menu
function updateTopMenu () {
  debugLog('updateTopMenu()');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getTopMenuData', url: window.location.href },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getTopMenuData")', lastError.message);
      }
      debugLog('updateTopMenu() response', response);

      if (response && Object.entries(response).length > 0) {
        const { orgName, orgLogo, possibilityId, noExactMatchOrgList } = response.data;

        $('#orgLogo').attr('src', orgLogo);
        $('#orgName').text(orgName ? orgName : 'Organization not found for this URL');
        $('#sendTopComment').click(() => {
          sendTopComment();
        });
        state.voterGuidePossibilityId = possibilityId;
        state.possibleOrgsList = noExactMatchOrgList;
        debugLog('updateTopMenu voterGuidePossibilityId: ' + state.voterGuidePossibilityId);
        if (orgName === undefined) {
          // rightNewGuideDialog();
        }
        updatePositionsPanel();
      } else {
        console.error('ERROR: updateTopMenu received empty response');
      }
    });
}


function updatePositionsPanel () {
  debugLog('updatePositionsPanel() getPositions');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getPositions', url: window.location.href, possibilityId: state.voterGuidePossibilityId },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getPositions")', lastError.message);
      }
      debugLog('updatePositionsPanel() response', response);
      $('.candidateWe').remove();   // Remove all the existing candidates, and then redraw them
      let names = [];
      let positions = [];
      if ((response && Object.entries(response).length > 0) && (response.data !== undefined) && (response.data.length > 0)) {
        let {data} = response;
        state.positionsCount = data.length;
        let selector = $('#sideArea');
        if (state.positionsCount > 0) {
          setSideAreaStatus();
          let insert = 0;
          let allHtml = $('#noDisplayPageBeforeFraming').html();
          for (let i = 0; i < state.positionsCount; i++) {
            debugLog('updatePositionsPanel data: ', data[i]);
            // be sure not to use position_stance_stored, statement_text_stored, or more_info_url_stored -- we want the possibilities, not the live data
            let { ballot_item_name: name, candidate_alternate_names: alternateNames, position_stance: stance, statement_text: comment, more_info_url: url,
              political_party: party, office_name: officeName, ballot_item_image_url_https_large: imageURL, position_we_vote_id: positionWeVoteId,
              candidate_we_vote_id: candidateWeVoteId, google_civic_election_id: googleCivicElectionId, office_we_vote_id: officeWeVoteId,
              organization_we_vote_id: organizationWeVoteId, possibility_position_id: possibilityPositionId, organization_name: organizationName,
              voter_guide_possibility_id: voterGuidePossibilityId
            } = data[i];

            if (names.includes(name.toLowerCase())) {
              // Note October 2019: This is a lttle risky, since it assumes the first one is the best one
              console.log('Skipping right position panel duplicate name "' + name + '", index = ' + insert);
              // eslint-disable-next-line no-continue
              continue;
            }
            names.push(name.toLowerCase());

            state.organizationWeVoteId = organizationWeVoteId;

            let position = {
              name,
              alternateNames,
              party,
              office: officeName ? officeName : '',
              photo: (imageURL && imageURL.length > 0) ? imageURL : defaultImage,
              comment: (comment && comment.length) ? comment : '',
              stance,
              url: url ? url : '',
              candidateWeVoteId,
              googleCivicElectionId,
              officeWeVoteId,
              organizationWeVoteId,
              organizationName,
              possibilityPositionId,
              positionWeVoteId,
              voterGuidePossibilityId,
            };

            let offs = allHtml.indexOf(name);
            for (let j = 0; j < alternateNames.length && offs < 0; j++) {
              offs = allHtml.indexOf(alternateNames[j]);
            }

            positions.push({
              position,
              selector,
              insert,
              sortOffset: offs,
            });
            insert++;
          }
        }
        // eslint-disable-next-line arrow-body-style
        positions.sort((a, b) => {
          return a.sortOffset > b.sortOffset ? 1 : -1;
        });
        for (let k = 0; k < positions.length; k++) {
          const {position, selector} = positions[k];
          rightPositionPanes(k, position, selector);
        }
        attachClickHandlers();
      } else {
        // This is not necessarily an error, it could be a brand new voter guide possibility with no position possibilities yet.
        console.log('Note: updatePositionsPanel() getPositions returned an empty response or no data element.');
      }
    }
  );
}

function rightPositionPanes (i, candidate, selector) {
  const { name, comment, url, positionWeVoteId,  } = candidate;
  let dupe = $(".candidateName:contains('" + name + "')").length;
  debugLog('rightPositionPanes ------------------------------ i: ' + i + ', ' + name);
  let furlNo = 'furlable-' + i;
  let candNo = 'candidateWe-' + i;
  if (name === null || name.length === 0) {
    debugWarn('rightPositionPane rejected index: ' + i + ', positionWeVoteId: ' + positionWeVoteId +
      ', positionWeVoteId: ' + positionWeVoteId);
    return false;
  }
  if (!dupe) {
    $(selector).append(candidatePaneMarkup(candNo, furlNo, i, candidate, false));
    $('.statementText-' + i).val(comment).css(getEditableElementTextStyles());
    $('.moreInfoURL-' + i).val(url).css(getEditableElementTextStyles());
    return true;
  }
  return false;
}

function candidatePaneMarkup (candNo, furlNo, i, candidate, detachedDialog) {
  let { party, name, alternateNames, photo, office, comment, candidateWeVoteId, voterGuidePossibilityId, positionWeVoteId,
    possibilityPositionId, organizationWeVoteId, organizationName, googleCivicElectionId, stance, } = candidate;
  if (party === undefined) {
    party = (detachedDialog) ? 'Party: Not specified' :'No match for any current candidate.';
  }
  let allNames = [];
  allNames.push(name);
  let aliases = '';
  if (alternateNames) {
    for (let i = 0; i < alternateNames.length; i++) {
      allNames.push(alternateNames[i]);
      if (alternateNames.length) {
        if (alternateNames.length === 1) {
          aliases = '[ ' +  alternateNames[i] + ' ]';
        } else if (i===0) {
          aliases = '[ ' +  alternateNames[i] + ', ';
        } else if (i === alternateNames.length -1) {
          aliases += alternateNames[i] + ' ]';
        } else {
          aliases += alternateNames[i] + ', ';
        }
      }
    }
  }

  let inLeftPane = false;
  for (let i = 0; i < allNames.length; i++) {
    inLeftPane = $('*:contains(' + allNames[i] + ')').length > 0 ? true : inLeftPane;
  }


  const isStored = positionWeVoteId !== undefined && positionWeVoteId !== null && positionWeVoteId.length > 0;
  let markup =
    "<div class='candidateWe " + candNo + "'>" +
    "  <div id='unfurlable-" + i + "' class='unfurlable' >" +
         unfurlableGrid(i, name, photo, party, office, inLeftPane, detachedDialog, stance, isStored, comment.trim().length > 0, false) +
    "    <input type='hidden' id='candidateName-" + i + "' value='" + name + "'>" +
    "    <input type='hidden' id='candidateWeVoteId-" + i + "' value='" + candidateWeVoteId + "'>" +
    "    <input type='hidden' id='voterGuidePossibilityId-" + i + "' value='" + voterGuidePossibilityId + "'>" +
    "    <input type='hidden' id='positionWeVoteId-" + i + "' value='" + positionWeVoteId + "'>" +
    "    <input type='hidden' id='possibilityPositionId-" + i + "' value='" + possibilityPositionId + "'>" +
    "    <input type='hidden' id='organizationWeVoteId-" + i + "' value='" + organizationWeVoteId + "'>" +
    "    <input type='hidden' id='organizationName-" + i + "' value='" + organizationName + "'>" +
    "    <input type='hidden' id='googleCivicElectionId-" + i + "' value='" + googleCivicElectionId + "'>" +
    "    <input type='hidden' id='allNames-" + i + "' value='" + allNames + "'>" +
    "    <input type='hidden' id='isStored-" + i + "' value='" + isStored + "'>" +
    '  </div>' +
    '  <div id= ' + furlNo + " class='furlable' " + (detachedDialog ? '' : 'hidden') + '>' +
    "    <div class='core-text aliases'>" + aliases + '</div>' +
    "    <span class='buttons'>" +
           supportButton(i, 'endorse', stance) +
           supportButton(i, 'oppose', stance) +
           supportButton(i, 'info', stance) +
    '    </span>' +
    "    <textarea rows='6' class='statementText-" + i + " removeContentStyles' style='margin: 0; text-align: left;'/>" +
    '    <br><span class="core-text" style="margin: 0; text-align: left;">If dedicated candidate page exists, enter URL here:</span>' +
    '    <input type="text" class="moreInfoURL-' + i + ' weInfoText removeContentStyles" style="margin: 0; text-align: left;" />' +
    "    <span class='buttons'>";
  if (!detachedDialog) {
    markup += " <button type='button' class='revealLeft-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>Reveal</button>";
  }
  markup += "   <button type='button' class='openInAdminApp-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>Admin App</button>";
  if (party !== undefined) {
    markup += " <button type='button' class='openInWebApp-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>WeVote.US</button>";
  }
  markup += "   <button type='button' class='saveButton-" + i + " weButton u2i-button u2i-widget u2i-corner-all removeContentStyles'>Save</button>" +
    '    </span>' +
    '  </div>' +
    '</div>';
  return markup;
}

function unfurlableGrid (index, name, photo, party, office, inLeftPane, detachedDialog, stance, isStored, showComment, iconOnly) {
  let iconContainer = '';

  if (!detachedDialog && !inLeftPane) {
    iconContainer =
      '<div id="iconContainer-' + index + '" class="iconContainer">' +
      '  <svg class="warningSvg">' +
      '    <path d="M0 0h24v24H0z" fill="none"/>' +
      '    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>' +
      '  </svg>' +
      '</div>';
  }

  // eslint-disable-next-line no-nested-ternary
  const type = (stance === 'OPPOSE') ? 'oppose' : 'endorse';
  const showThumb = stance !== 'NO_STANCE';
  const showSomething = !detachedDialog;
  const showBar = showThumb && showComment;
  const viewBoxComment = showBar ? '"0 0 22 22"' : '"0 0 24 24"';
  const showThumbOnly = showThumb && !showComment;
  const showCommentOnly = !showThumb && showComment;
  const showOnlyClass = (showCommentOnly ? 'commentOnly' : '') + (showThumbOnly ? 'thumbOnly' : '') + (stance === 'NO_STANCE' && !showComment ? 'emptyInfo' : '');

  if (showSomething && inLeftPane) {
    iconContainer +=
        '<div id="iconContainer-' + index + '" class="iconContainer ' + showOnlyClass + '" style="background-color:' + backgroundColor(stance, isStored) + '">';
    if (showThumb) {
      iconContainer += markupForThumbSvg ('thumbIconSVG', type, 'white');
    }
    if (showBar) {
      iconContainer +=
        '  <div style="transform: translate(19px, -26px); color: white; font-size: 10pt; background-color:' + backgroundColor(stance, isStored) + '; width: 2px;">&#124;</div>';
    }
    if (showComment) {    // https://material.io/resources/icons/?style=baseline comment
      iconContainer +=
        '  <svg class="commentIconSVG ' + (showCommentOnly ? 'commentIconOnly' : '') + '" style="margin-top:3px; background-color:' + backgroundColor(stance, isStored) + ';" viewBox=' + viewBoxComment + '>' +
        '    <path fill="white" d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>' +
        '    <path d="M0 0h24v24H0z" fill="none"/>' +
        '  </svg>';
    }
    iconContainer +=
       '</div>';
  }

  let markup =
    '<div class="gridUnfurlableContainer core-text">' +
      '<div class="gridCandidatePhoto">' +
        '<img class="photoWe removeContentStyles" alt="candidateWe" src="' + photo + '">' +
      '</div>' +
        (detachedDialog ? ('<input type="text" class="candidateNameInput-' + index + '"/>') : ('<div class="gridCandidateName">' + name + '</div>')) +
        '<div class="gridIcon">' +
            iconContainer +
        '</div>' +
      '<div class="gridCandidateParty">' + party + '</div>' +
      '<div class="gridOfficeTitle">' + office + '</div>' +
    '</div>';

  if (iconOnly) {
    markup = iconContainer;
  }

  return markup;
}

function backgroundColor (stance, isStored) {
  if (stance === 'SUPPORT') {
    return isStored ? colors.STORED_SUPPORT_BACKGROUND : colors.POSS_SUPPORT_BACKGROUND;
  }
  if (stance === 'OPPOSE') {
    return isStored ? colors.STORED_OPPOSE_BACKGROUND : colors.POSS_OPPOSE_BACKGROUND;
  }
  if (stance === 'NO_STANCE') {
    return colors.POSS_INFO_BACKGROUND;
  }

  return 'purple';
}

function greyAllPositionPanes (booleanGreyIt) {
  if (booleanGreyIt) {
    $('div.candidateWe').css('opacity', '0.25');
  } else {
    $('div.candidateWe').css('opacity', '1');
  }
}

function selectOneDeselectOthers (type, targetFurl) {
  let buttons = $(targetFurl).find(':button');
  buttons.each((i, but) => {
    const { className } = but; // "infoButton-2 weButton removeContentStyles deselected"
    // eslint-disable-next-line prefer-destructuring
    const number = className.match(/-(\d*)\s/)[1];

    const iterationType = className.substring(0, className.indexOf('Button'));
    switch (iterationType) {
      case 'endorse':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'SUPPORT': '');
        break;
      case 'oppose':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'OPPOSE': '');
        break;
      case 'info':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'INFO_ONLY': '');
        break;
    }
  });
}

// As of Sept 2019, we are only updating possiblilities here, we are not changing the "stored" live presentation data
function saveUpdatedCandidatePossiblePosition (event, detachedDialog) {
  const targetCand = event.currentTarget.className; // div.candidateWe.candidateWe-4
  const targetFurl = '#' + targetCand.replace('candidateWe candidateWe', 'furlable');
  // eslint-disable-next-line prefer-destructuring
  const number = targetFurl.match(/-(\d*)\s/)[1];
  const buttonContainerId = detachedDialog ? '#1000' : '#furlable-' + number;
  const buttons = $(buttonContainerId).find(':button');
  let stance = 'NO_STANCE';

  buttons.each((i, but) => {
    const {className} = but;   // "infoButton-2 weButton removeContentStyles deselected"
    if (className.match(/endorse.*?selectedEndorsed/)) {
      stance = 'SUPPORT';
    } else if (className.match(/oppose.*?selectedOpposed/)) {
      stance = 'OPPOSE';
    } else if (className.match(/info.*?selectedInfo/)) {
      // 9/16/19: Dale says 'INFO_ONLY' should be saved as 'NO_STANCE' in this situation
      stance = 'NO_STANCE';
    }
  });

  const itemName = detachedDialog ? $('.candidateNameInput-1000').val() : '';
  const voterGuidePossibilityPositionId = detachedDialog ? 0 : $('#possibilityPositionId-' + number).val();
  const statementText = $('.statementText-' + number).val().trim();
  const moreInfoURL = $('.moreInfoURL-' + number).val().trim();
  const isStored =  $('.isStored-' + number).val();
  // Since we might have changed the stance and/or comment, update the right icon in the unfurlable grid
  let iconContainer = unfurlableGrid (number, '', '', '', '', true, false, stance, isStored, statementText.length > 0, true);
  $('#iconContainer-' + number).wrap('<p/>').parent().html(iconContainer);

  const {chrome: {runtime: {sendMessage}}} = window;
  sendMessage({
    command: 'savePosition',
    itemName,
    voterGuidePossibilityId: state.voterGuidePossibilityId,
    voterGuidePossibilityPositionId,
    stance,
    statementText,
    moreInfoURL,
  },
  function (response) {
    let {lastError} = runtime;
    if (lastError) {
      console.warn(' chrome.runtime.sendMessage("savePosition")', lastError.message);
    }
    debugLog('saveUpdatedCandidatePossiblePosition() response', response);

    if (detachedDialog) {
      $('div.ui-dialog').remove();
      setSideAreaStatus();
      updatePositionsPanel();
    } else {
      const furlables = $('.furlable');
      const thisDiv = $('#furlable-' + number);
      const lastDiv = furlables[furlables.length - 1];
      let forceNumber = Number(number);
      forceNumber = (thisDiv[0] === lastDiv) ? 0 : forceNumber + 1;
      for (let i = 0; i < 10; i++) {
        if ($('#furlable-' + forceNumber).length === 0) {
          forceNumber++;      // skip any missing elements
        } else {
          break;
        }
      }
      deactivateActivePositionPane();
      unfurlOnePositionPane(null, forceNumber);
    }
    // Here we are still in the response from 'savePosition'.  After a successful save on the right side (voterGuidePossibilityPositionSave in backgroundWeVoteAPICalls)
    // return here (the left side) and after advancing the open pane (above), call getRefreshedHighlights() (below) to send a 'getHighlights' message to the right side
    // (extWordHighlighter) with a doReHighlight: true.  This will invoke getHighlightsListFromApiServer this will make an API call
    // to /voterGuidePossibilityHighlightsRetrieve?, upon return from the API call, it will call initializeHighlightsData() (in backgroundWeVoteApiCalls)
    // to sort and process the raw highlights data, and then with doReHighlight true, will call requestReHighlight() which will then
    // send a message back to here (contentWeVoteU which is on the left side) with the processed data to do the re-highlighting.

    // 9/26/19:  The messaging all works, but the dom in the iframe is inaccessible at this point, will go with the
    // iframe reload (within getRefreshedHighlights) as a work around for now.
    // removeAllHighlights();

    getRefreshedHighlights();
  });
}

function unfurlOnePositionPane (event, forceNumber) {
  let targetFurl ='';
  let number = -1;
  if (forceNumber > -1) {
    targetFurl = '#furlable-' + forceNumber;
    number = forceNumber;
  } else {
    const targetCand = event.currentTarget.className; // div.candidateWe.candidateWe-4
    targetFurl = '#' + targetCand.replace('candidateWe candidateWe', 'furlable');
    number = targetFurl.substring(targetFurl.indexOf('-') + 1);
    let selectorForName = '#' + event.currentTarget.classList[1].replace('candidateWe', 'candidateName');
    state.candidateName = $(selectorForName).val();
    let selectorForAllNames = '#' + event.currentTarget.classList[1].replace('candidateWe', 'allNames');
    state.allNames = $(selectorForAllNames).val();
  }
  const element = document.getElementById('unfurlable-' + number);
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); // alignTioTop
  $(targetFurl)[0].scrollIntoView();
  addHandlersForCandidatePaneButtons(targetFurl, number, false);
  $(targetFurl).removeAttr('hidden');
}

function addHandlersForCandidatePaneButtons (targetDiv, number, detachedDialog) {
  let buttons = $(targetDiv).find(':button');
  buttons.each((i, but) => {
    const { className } = but;
    if (className.startsWith('endorse')) {
      $(but).click(() => {
        selectOneDeselectOthers('endorse', targetDiv)
      });
    } else if (className.startsWith('oppose')) {
      $(but).click(() => {
        selectOneDeselectOthers('oppose', targetDiv)
      });
    } else if (className.startsWith('info')) {
      $(but).click(() => {
        selectOneDeselectOthers('info', targetDiv)
      });
    } else if (className.startsWith('revealLeft')) {
      $(but).click((event) => {
        event.stopPropagation();
        // Try each name, hopefully only one will be on the screen, if not we will end up at the last matching name
        let aliases = state.allNames.split(',');
        for (let i = 0; i < aliases.length; i++) {
          const emphasizedElement = $('#frame:first').contents().find(':contains(' + aliases[i] + '):last');
          if (emphasizedElement.length) {
            $(emphasizedElement)[0].scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
        }
      });
    } else if (className.startsWith('openInAdminApp-')) {
      $(but).click((event) => {
        event.stopPropagation();
        let candidateName = $('#candidateName-' + number).val();
        candidateName = encodeURIComponent(candidateName);
        let URL = 'https://api.wevoteusa.org/c/?show_all_elections=1&hide_candidate_tools=0&page=0&state_code=' +
          '&candidate_search=' + candidateName + '&show_all_elections=False';
        window.open(URL, '_blank');

      });
    } else if (className.startsWith('openInWebApp-')) {
      $(but).click((event) => {
        event.stopPropagation();
        const candidateWeVoteId = $('#candidateWeVoteId-' + number).val();
        if (candidateWeVoteId.length) {
          let URL = 'https://wevote.us/candidate/' + candidateWeVoteId + '/b/btdo/';
          window.open(URL, '_blank');
        }
      });
    } else if (className.startsWith('save')) {
      $(but).click((event) => {
        event.stopPropagation();
        saveUpdatedCandidatePossiblePosition(event, detachedDialog);
      });
    }
  });
}

function deactivateActivePositionPane () {
  const visibleElements = $('.furlable:visible');
  if (visibleElements.length > 0) {
    // console.log('deactivateActivePositionPane() visibleElements: ',visibleElements);
    // eslint-disable-next-line prefer-destructuring
    let visibleElement = visibleElements[0];
    let visibleElementId = visibleElement.id;
    let buttons = $('#' + visibleElementId + ' :button');
    buttons.unbind();
    $('#' + visibleElementId).attr('hidden', true);
    debugLog('deactivateActivePositionPane() buttons: ', buttons);  // Do not remove
  } else {
    debugLog('deactivateActivePositionPane() -- No open panes');    // Do not remove
  }
}

// The text they select, will need to be the full name that we send to the API, although they will have a chance to edit it before sending
// eslint-disable-next-line no-unused-vars
function openSuggestionPopUp (selection) {
  const i = 1000;
  $('[role=dialog]').remove();  // Only one suggestion dialog at a time is allowed, so close any previous
  if (selection.length > 0) {
    let candidate = {
      name: selection,
      office: '',
      party:  undefined,
      photo: defaultImage,
      comment: '',
      url: window.location.href,
      stance: 'SUPPORT',
    };
    $(candidatePaneMarkup(i, i, i, candidate, true)).dialog({
      title: 'Create a We Vote endorsement',
      show: true,
      width: 380,
      resizable: false,
      fixedDimensions: true
    });
    // Styles injected here preempt all others, especially those from the underlying endorsement page, which we do not control
    $("button[title='Close']").css({
      'font-size': '16px',
      'float': 'right',
      'padding-right': '2px',
      'line-height': 'normal',
    });
    $('.u2i-dialog-titlebar').css('height', '28px');
    $('.u2i-resizable-handle').css('display', 'none');
    $('.u2i-dialog-title').addClass('createDlgTitle');
    $('#unfurlable-' + i).css('height', i === 1000 ? '80px' : '66px');
    const can = '.candidateWe.1000';
    $(can).css({'background-color': '#FFFFF6', 'padding': '8px 0 8px 8px'});
    $('#1000').removeClass();
    $('.candidateNameInput-1000').val(selection).css({
      width: '80%',
      height: '24px',
      margin: '0',
      padding: '0 0 0 4px',
      'font-family': '"Helvetica Neue", Helvetica, Arial, sans-serif',
      'font-size': '16px',
      'font-stretch': '100%',
      'font-style': 'normal',
      'font-weight': 400,
      color: 'black',
    });
    $('.statementText-' + i).val(candidate.comment).css(getEditableElementTextStyles());
    $('.moreInfoURL-' + i).val(candidate.url).css(getEditableElementTextStyles());
    $('#voterGuidePossibilityId-' + i).val(state.voterGuidePossibilityId);
    $('#organizationWeVoteId-' + i).val(state.organizationWeVoteId);
    $('.openInWebApp-' + i).stop(); // Stop animations, on the webapp button, since we don't have the twitter id necessary for the url
    $('div.u2i-dialog').on('dialogclose', () => {
      $('div.u2i-dialog').remove();
    });
    addHandlersForCandidatePaneButtons('#1000', '1000', true);
  }
}

function getEditableElementTextStyles () {
  return {
    width: '95%',
    margin: '5px 0 5px 0',
    border: '1px solid grey',
    padding: '5px',
    'font-family': '"Helvetica Neue", Helvetica, Arial, sans-serif',
    'font-size': '12px',
    'font-style': 'normal',
    'font-variant': 'normal',
    'font-weight': 400,
    'line-height': '14px',
  };
}

// SVGs lifted from WebApp thumbs-up-color-icon.svg and thumbs-down-color-icon.svg
function supportButton (i, type, stance) {
  let buttonText = '';
  let fillColor = '';
  let selectionStyle = '';
  let textClass = '';
  if (type === 'endorse') {
    buttonText = 'ENDORSED';
    textClass = 'supportButtonText';
    if (stance === 'SUPPORT') {
      fillColor = 'white';
      selectionStyle = 'selectedEndorsed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else if (type === 'oppose') {
    buttonText = 'OPPOSED';
    textClass = 'supportButtonText';
    if (stance === 'OPPOSE') {
      fillColor = 'white';
      selectionStyle = 'selectedOpposed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else {
    buttonText = 'INFO ONLY';
    textClass = 'supportButtonTextNoIcon';
    if (stance === 'INFO_ONLY' || stance === 'NO_STANCE') {
      fillColor = 'white';
      selectionStyle = 'selectedInfo';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  }

  let markup = "<button type='button' class='" + type + 'Button-' + i + ' weButton removeContentStyles ' + selectionStyle + "'>";
  markup += markupForThumbSvg('supportButtonSVG', type, fillColor);
  markup += "<span class='" + textClass + "'>" + buttonText + '</span></button>';

  return markup;
}

function markupForThumbSvg (classString, type, fillColor) {
  if (type === 'endorse' || type === 'oppose') {
    let markup = "<svg class='" + classString + "' style='margin-top:3px'>";

    if (type === 'endorse') {
      markup += "<path fill='" + fillColor + "' d='M6,16.8181818 L8.36363636,16.8181818 L8.36363636,9.72727273 L6,9.72727273 L6,16.8181818 L6,16.8181818 Z M19,10.3181818 C19,9.66818182 18.4681818,9.13636364 17.8181818,9.13636364 L14.0895455,9.13636364 L14.6509091,6.43590909 L14.6686364,6.24681818 C14.6686364,6.00454545 14.5681818,5.78 14.4086364,5.62045455 L13.7822727,5 L9.89409091,8.89409091 C9.67545455,9.10681818 9.54545455,9.40227273 9.54545455,9.72727273 L9.54545455,15.6363636 C9.54545455,16.2863636 10.0772727,16.8181818 10.7272727,16.8181818 L16.0454545,16.8181818 C16.5359091,16.8181818 16.9554545,16.5227273 17.1327273,16.0972727 L18.9172727,11.9313636 C18.9704545,11.7954545 19,11.6536364 19,11.5 L19,10.3713636 L18.9940909,10.3654545 L19,10.3181818 L19,10.3181818 Z'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    } else if (type === 'oppose') {
      markup += "<path fill='" + fillColor + "' d='M5,18.8199997 L7.36399994,18.8199997 L7.36399994,11.7279999 L5,11.7279999 L5,18.8199997 L5,18.8199997 Z M18.0019997,12.3189999 C18.0019997,11.6688999 17.4700997,11.1369999 16.8199997,11.1369999 L13.0907898,11.1369999 L13.6522398,8.43612996 L13.6699698,8.24700997 C13.6699698,8.00469997 13.5694998,7.78011998 13.4099298,7.62054998 L12.7834698,7 L8.8946899,10.8946899 C8.67601991,11.1074499 8.54599991,11.4029499 8.54599991,11.7279999 L8.54599991,17.6379997 C8.54599991,18.2880997 9.07789989,18.8199997 9.72799988,18.8199997 L15.0469997,18.8199997 C15.5375297,18.8199997 15.9571397,18.5244997 16.1344397,18.0989797 L17.9192597,13.9324298 C17.9724497,13.7964998 18.0019997,13.6546598 18.0019997,13.5009998 L18.0019997,12.3721899 L17.9960897,12.3662799 L18.0019997,12.3189999 L18.0019997,12.3189999 Z' transform='rotate(-180 11.501 12.91)'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    }

    markup += '</svg>';

    return markup;
  }
  return '';
}

function toggleSupportButton (button, i, type, stance) {
  const svg = $(button.find('path')[0]);
  if (type === 'endorse') {
    if (stance === 'SUPPORT') {
      button.removeClass('deselected').addClass('selectedEndorsed');
      svg.attr('fill', '#FFFFFF');  // Modify the SVG thumb color to be white
    } else {
      button.removeClass('selectedEndorsed').addClass('deselected');
      svg.attr('fill', '#235470');
    }
  } else if (type === 'oppose') {
    if (stance === 'OPPOSE') {
      button.removeClass('deselected').addClass('selectedOpposed');
      svg.attr('fill', '#FFFFFF');  // Modify the SVG thumb color to be white
    } else {
      button.removeClass('selectedOpposed').addClass('deselected');
      svg.attr('fill', '#235470');
    }
  } else if (stance === 'INFO_ONLY' || stance === 'NO_STANCE') {
    button.removeClass('deselected').addClass('selectedInfo');
  } else {
    button.removeClass('selectedInfo').addClass('deselected');
  }
}

function isParentFurlable (target) {
  const { classname } = target;
  if (classname === 'furlable') {
    return true;
  }
  let i = 0;
  let scan = target;
  while(scan && scan.id !== 'sideArea' && scan.className !== 'furlable') {
    scan = scan.parentElement;
    if(i++ > 10) {
      break;
    }
  }
  return scan && (scan.className === 'furlable');
}

function attachClickHandlers () {
  //console.log("attachClickHandlers", $('div.candidateWe').length);

  $('div.candidateWe').click((event) => {
    if (!isParentFurlable(event.target)) {
      deactivateActivePositionPane();
      unfurlOnePositionPane(event, -1);
    } else {
      debugWarn('candidateWe click IGNORED since target is in furlable area', event);
    }
  });
}

function orgChoiceDialog (orgList) {
  // console.log('building orgChoiceDialog');
  const sortedList = sortURLs(orgList);
  let markup =
    '<div id="orgChoiceDialog" class="removeContentStyles" style="background-color: rgb(255, 255, 255)">' +
    '  <div class="chooseSubTitles">This endorsement page does not have an exact match in our database.</div>' +
    '  <div class="chooseSubTitles"><b>Please select one of the choices below.</b></div>' +
    '  <table id="orgSelection">';
  sortedList.forEach((item) => {
    const { organization_we_vote_id: id, organization_name: name, organization_website: url } = item;
    let dispUrl = (url.length < 45) ? url : url.substring(0, 45) + '...';
    markup +=
      '  <tr class="topTd">' +
      '    <td><button type="button" id="orgChoice-' + id + '" class="orgChoiceButton weButton">' + name + '</button></td>' +
      '  </tr>' +
      '  <tr class="bottomTd">' +
      '    <td><a id="externalLink" href="' + url + '" target="_blank">' + dispUrl + '</a>' +
      '  </tr>';
  });
  markup +=
    '  </table>' +
    '</div>';

  setSideAreaStatus();
  $('#sideArea').append(markup);
  $('.orgChoiceButton').each((i, but) => {
    $(but).click((event) => {
      const {id} = event.currentTarget;
      const {href} = window.location;
      let organizationWeVoteId = id.substring(id.indexOf('-') + 1);

      // console.log('orgChoiceDialog  button onclick:  ' + event.currentTarget.id);
      const {chrome: {runtime: {sendMessage}}} = window;
      sendMessage({
        command: 'voterGuidePossibilitySave',
        organizationWeVoteId: organizationWeVoteId,
        voterGuidePossibilityId: state.voterGuidePossibilityId,
        internalNotes: 'Proposed endorsement page: ' + href,
        voterWeVoteId : state.voterWeVoteId,
      },
      function (res) {
        let {lastError} = runtime;
        if (lastError) {
          console.warn(' chrome.runtime.sendMessage("setSideAreaStatus voterGuidePossibilitySave")', lastError.message);
        }
        debugLog('setSideAreaStatus voterGuidePossibilitySave() response', res);
        const{ organization_we_vote_id: id } = res.res.organization;
        if (id && id.length) {
          updateTopMenu();
          $('#orgChoiceDialog').remove();  // Remove this selection menu/dialog
          setSideAreaStatus('No Candidate endorsements have been captured yet.');
        }
      });
    });
  });
}

function sendTopComment () {
  // console.log('orgChoiceDialog  button onclick:  ' + event.currentTarget.id);
  const {chrome: {runtime: {sendMessage}}} = window;
  sendMessage({
    command: 'voterGuidePossibilitySave',
    organizationWeVoteId: state.organizationWeVoteId,
    voterGuidePossibilityId: state.voterGuidePossibilityId,
    internalNotes: $('#topComment').val(),
    contributorEmail: $('#emailWe').val(),
    voterWeVoteId : state.voterWeVoteId,
  },
  function (res) {
    let {lastError} = runtime;
    if (lastError) {
      console.warn(' chrome.runtime.sendMessage("sendTopComment voterGuidePossibilitySave")', lastError.message);
    }
    debugLog('sendTopComment voterGuidePossibilitySave() response', res);
    $('#dlgAnchor').dialog({
      show: true,
      width: 330,
      height: 65,
      resizable: false,
      fixedDimensions: true,
      position: { my: 'right top', at: 'left bottom', of: '#sendTopComment' },
      open: function () {
        const markup = '<div class="core-text" style="text-align: center; font-size: large; padding-top: 10px;">Thank you for your help!</div>';
        $(this).html(markup);
      },
    });
  });
}

function sortURLs (orgList) {
  const {href} = window.location;
  orgList.forEach((item) => {
    const { organization_website: url } = item;
    // eslint-disable-next-line no-undef
    item.similarity = compareTwoStrings(href, url);
  });

  orgList.sort(function (a, b) {
    return (a.similarity < b.similarity) ? 1 : -1;
  });

  return orgList;
}

function setSideAreaStatus (text) {
  if (!text || text.length === 0) {
    $('#sideAreaStatus').remove();
  } else if ($('#sideAreaStatus').length === 0) {
    $('#sideArea').append('<div id="sideAreaStatus">' + text + '</div>');
  }
}
