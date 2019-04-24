
function candidatePane(candidate, selector) {
  $(selector).append("" +
    "<div id='candidate'>" +
      "<div id='unfurlable'>" +
        "<span id='unfurlableTopMenu'>" +
          "<img id='photo' src=" + candidate.photo + " class='noStyleWe' />" +
          "<div id='nameBox' class='noStyleWe'>" +
           "<div id='nameField'>" + candidate.name + "</div>" +
          " <div id='titleField'>" + candidate.office + "</div>" +
          "</div>" +
        "</span>" +
      "</div>" +
      "<div id='furlable'>" +
        "<span id='buttons'>" +
          "<button type='button' id='endorsedButton' class='weButton noStyleWe' >Endorsed</button>" +
          // "<button type='button' id='endorsedButton' class='fas fa-check' >Endorsed</button>" +
          "<button type='button' id='opposedButton' class='weButton noStyleWe' >Opposed</button>" +
          "<button type='button' id='infoButton' class='weButton noStyleWe' >Information</button>" +
        "</span>" +
        "<textarea rows='6' id='comment' placeholder='url' />" +
        "<input type='text' id='source' placeholder='url' />" +
        "<span id='bottomButton'>" +
          "<button type='button' id='saveButton' class='weButton noStyleWe' >Save</button>" +
        "</span>" +
      "</div>" +
    "</div>"
  );
  $('#comment').val(candidate.comment);
  $('#source').val(candidate.url);
}