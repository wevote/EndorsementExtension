const $ = window.$;

function displayWeVoteUI () {  // eslint-disable-line no-unused-vars
  try {
    // https://codepen.io/markconroy/pen/rZoNbm
    let hr = window.location.href;
    let topMenuHeight = 75;
    let sideAreaWidth = 400;
    let iFrameHeight = window.innerHeight - topMenuHeight;
    let iFrameWidth = window.innerWidth - sideAreaWidth;
    let bod = $('body');
    $(bod).children().wrapAll("<div id='we-trash' >").hide();  // if you remove it, other js goes nuts
    $(bod).children().wrapAll("<div id='weContainer' >");  // Ends up before we-trash
    $('#we-trash').insertAfter('#weContainer');

    let weContainer = $('#weContainer');
    $(weContainer).append("" +
      "<span id='topMenu'>" +
      "</span>").append("<div id='weFlexGrid' ></div>");

    let weFlexGrid = $('#weFlexGrid');
    $(weFlexGrid).append('<aside id="frameDiv"><iframe id="frame" width=' + iFrameWidth + ' height=' + iFrameHeight + '></iframe></aside>');
    $(weFlexGrid).append('<section id="sideArea"></section>');

    $("#frame").attr("src", hr);

    topMenu();
    // let noCandiatesFromServerYet = [];
    // candidatePanel(noCandiatesFromServerYet, $("#sideArea"));

    updateTopMenu();

    updatePositionsPanel();
  } catch (err) {
    console.log("jQuery dialog in tabWordHighligher threw: ", err);
  }
  return true;  // indicates that we call the response function asynchronously.  https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
}

/*
  May 16, 2019
  TODO: For now if the API server is swapped local/production you will need to get a new device ID.
  With the extension running, go to the wevote.us or localhost:3000 page, and open the popup, and press the login button.
  Then when you navigate to some endorsement page. the device id will be available in local storage.
 */

function signIn() {
  console.log("STEVE new signIn");
  chrome.runtime.sendMessage({ command: "getVoterInfo",},
    function (response) {
      const { voterName, voterPhotoURL, voterWeVoteId, voterEmail } = response;
      voterInfo = {
        name: voterName,
        photo: voterPhotoURL,
        voterId: voterWeVoteId,
        email: voterEmail
      };

      if (voterPhotoURL.length > 0) {
        $('#signIn').replaceWith("<img class='photov voterPhoto noStyleWe' alt='candidate' src=" + voterPhotoURL + " />");
      }
    });
  return false;
}


function topMenu() {
  let topMarkup = "" +
    "<img id='orgLogo' src='https://raw.githubusercontent.com/wevote/EndorsementExtension/develop/icon48.png'>" +
    "<b><span id='orgName'></span></b>" +
    "<input type='text' id='email' name='email' placeholder='Email' >" +
    "<input type='text' id='topComment' name='topComment' placeholder='Comment here...' >" +
    "<button type='button' id='signIn' class='signInButton weButton noStyleWe'>SIGN IN</button>";
  $('#topMenu').append(topMarkup);

  console.log("STEVE BEFORE ADDING SI?GN??????IN HANDLER");
  document.getElementById("signIn").addEventListener('click', function () {
    console.log("Sign in pressed");
    signIn();
    return false;
  });

  // $('#signIn').on('click', 'button', function(){
  //   signIn();
  // });
}

// Call into the background script to do a voterGuidePossibilityRetrieve() api call, and return the data, then update the top menu
function updateTopMenu() {
  console.log("STEVE updateTopMenu()");
  chrome.runtime.sendMessage({ command: "getTopMenuData", url: window.location.href },
    function (response) {
      console.log("STEVE updateTopMenu() response", response);

      if (response && Object.entries(response).length > 0 ) {
        const { email, orgName, twitterHandle, weVoteId, orgWebsite, orgLogo, possibilityUrl, possibilityId } = response.data;  // eslint-disable-line no-unused-vars

        $('#orgLogo').attr("src", orgLogo);
        $("#orgName").text(orgName);
        $("#email").text(email);
      } else {
        console.log("ERROR: updateTopMenu received empty response");
      }
    });
}

function updatePositionsPanel() {
  console.log("STEVE getPositions()");
  chrome.runtime.sendMessage({ command: "getPositions", url: window.location.href },
    function (response) {
      console.log("STEVE getPositions() response", response);
      const defaultImage = "https://raw.githubusercontent.com/wevote/EndorsementExtension/develop/icon48.png";
      if ((response && Object.entries(response).length > 0) && (response.data !== undefined) && (response.data.length > 0)) {
        let data = response.data;
        let l = data.length;
        let selector = $("#sideArea");
        if (l > 0) {
          for (let i = 0; i < l; i++) {
            console.log("STEVE getPositions data: ", data[i]);
            let { ballot_item_name: name, position_stance: stance, statement_text_stored: comment, more_info_url_stored: url,
              political_party: party, office_name: officeName, ballot_item_image_url_https_large: imageURL,
            } = data[i];

            // if (party && party.length > 0) {
            //   name += " (" + party + ")";
            // }
            let position = {
              name: name,
              party: party,
              office: officeName ? officeName : "",
              photo: (imageURL && imageURL.length > 0 ) ? imageURL : defaultImage,
              comment: ( comment && comment.length ) ? comment : "",
              stance: stance,
              url: url ? url : ""
            };
            rightPositionPanes(i, position, selector);
          }
        }
      } else {
        console.log("ERROR: updatePositionsPanel() getPositions returned an empty response or no data element.")
      }
    }
  );
}

function rightPositionPanes(i, candidate, selector) {
  let markup = "" +
    "<div class='candidate'>" +
      "<div class='unfurlable'>" +
        "<span class='unfurlableTopMenu'>" +
          "<img class='photo noStyleWe' alt='candidate' src=" + candidate.photo + " />" +
          "<div class='nameBox  noStyleWe'>" +
            "<div class='candidateName'>" + candidate.name + "</div>" +
            "<div class='candidateParty'>" + candidate.party + "</div>" +
            "<div class='officeTitle'>" + candidate.office + "</div>" +
          "</div>" +
        "</span>" +
      "</div>" +
      "<div class='furlable'>" +
        "<span class='buttons'>" +
          supportButton(i, 'endorse', candidate.stance ) +
          supportButton(i, 'oppose', candidate.stance ) +
          supportButton(i, 'info', candidate.stance ) +
        "</span>" +
        "<textarea rows='6' class='commentWe" + i + "' placeholder='url' />" +
        "<input type='text' class='sourceWe" + i + "' placeholder='url' />" +
        "<span class='bottomButton'>" +
          "<button type='button' class='saveButton" + i + " weButton noStyleWe' >Save</button>" +
        "</span>" +
      "</div>" +
    "</div>";
  $(selector).append(markup);
  $('.commentWe' + i).val(candidate.comment);
  $('.sourceWe' + i).val(candidate.url);
  $(selector).css({'height': $('#frameDiv').height() + 'px', 'overflow': 'scroll'});
}

// Svgs lifted from WebApp thumbs-up-color-icon.svg and thumbs-down-color-icon.svg
function supportButton(i, type, stance ) {
  let buttonText = '';
  let fillColor = '';
  let selectionStyle = '';
  let textClass = '';
  if (type === 'endorse') {
    buttonText = 'ENDORSED';
    textClass = 'supportButtonText';
    if (stance === "SUPPORT") {
      fillColor = 'white';
      selectionStyle = 'selectedEndorsed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else if (type === 'oppose') {
    buttonText = 'OPPOSED';
    textClass = 'supportButtonText';
    if (stance === "OPPOSE") {
      fillColor = 'white';
      selectionStyle = 'selectedOpposed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else {
    buttonText = 'INFO ONLY';
    textClass = 'supportButtonTextNoIcon';
    if (stance === "NO_STANCE") {
      fillColor = 'white';
      selectionStyle = 'selectedOpposed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }

  }
  let markup = "<button type='button' class='endorsedButton" + i + " weButton noStyleWe " + selectionStyle + "'>";

  if (type === 'endorse' || type === 'oppose') {
    markup += "<svg class='supportButtonSVG' viewBox='0 0 24 24'>";

    if (type === 'endorse') {
      markup += "<path fill='" + fillColor + "' d='M6,16.8181818 L8.36363636,16.8181818 L8.36363636,9.72727273 L6,9.72727273 L6,16.8181818 L6,16.8181818 Z M19,10.3181818 C19,9.66818182 18.4681818,9.13636364 17.8181818,9.13636364 L14.0895455,9.13636364 L14.6509091,6.43590909 L14.6686364,6.24681818 C14.6686364,6.00454545 14.5681818,5.78 14.4086364,5.62045455 L13.7822727,5 L9.89409091,8.89409091 C9.67545455,9.10681818 9.54545455,9.40227273 9.54545455,9.72727273 L9.54545455,15.6363636 C9.54545455,16.2863636 10.0772727,16.8181818 10.7272727,16.8181818 L16.0454545,16.8181818 C16.5359091,16.8181818 16.9554545,16.5227273 17.1327273,16.0972727 L18.9172727,11.9313636 C18.9704545,11.7954545 19,11.6536364 19,11.5 L19,10.3713636 L18.9940909,10.3654545 L19,10.3181818 L19,10.3181818 Z'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    } else if (type === 'oppose') {
      markup += "<path fill='" + fillColor + "' d='M5,18.8199997 L7.36399994,18.8199997 L7.36399994,11.7279999 L5,11.7279999 L5,18.8199997 L5,18.8199997 Z M18.0019997,12.3189999 C18.0019997,11.6688999 17.4700997,11.1369999 16.8199997,11.1369999 L13.0907898,11.1369999 L13.6522398,8.43612996 L13.6699698,8.24700997 C13.6699698,8.00469997 13.5694998,7.78011998 13.4099298,7.62054998 L12.7834698,7 L8.8946899,10.8946899 C8.67601991,11.1074499 8.54599991,11.4029499 8.54599991,11.7279999 L8.54599991,17.6379997 C8.54599991,18.2880997 9.07789989,18.8199997 9.72799988,18.8199997 L15.0469997,18.8199997 C15.5375297,18.8199997 15.9571397,18.5244997 16.1344397,18.0989797 L17.9192597,13.9324298 C17.9724497,13.7964998 18.0019997,13.6546598 18.0019997,13.5009998 L18.0019997,12.3721899 L17.9960897,12.3662799 L18.0019997,12.3189999 L18.0019997,12.3189999 Z' transform='rotate(-180 11.501 12.91)'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    }

    markup += "</svg>";
  }

  markup += "<span class='" + textClass + "'>" + buttonText + "</span></button>";

  return markup;
}
