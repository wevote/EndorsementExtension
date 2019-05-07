const $ = window.$;

let demoCandidates = [
  {
    photo: 'https://s3.amazonaws.com/ballotpedia-api/storage/uploads/thumbs/200/300/crop/best/ODP-1082.jpg',
    name: 'Sarah Bitter (Democrat)',
    office: 'Ohio State Senate to represent District 7',
    comment: 'Sara Bitter is a mother, lawyer and leader in advocacy. She and her husband, Kai, are the parents of two children living with a developmental disability.',
    url: window.location.href.trim(),
  },
  {
    photo: 'https://s3.amazonaws.com/ballotpedia-api/storage/uploads/thumbs/200/300/crop/best/Teresa_fedor.jpg',
    name: 'Teresa Fedor (Democrat)',
    office: 'Ohio State Senate to represent District 11',
    comment: 'Teresa Fedor lives in Toledo, Ohio. Fedor served in the U.S. Air Force from 1975 to 1978 and the Ohio Air National Guard from 1980 to 1983. She earned a bachelor\'s degree in education from the University of Toledo in 1983. Fedor\'s career experience includes working as teacher with Toledo Public Schools..',
    url: window.location.href.trim(),
  },
  {
    photo: 'https://s3.amazonaws.com/ballotpedia-api/storage/uploads/thumbs/200/300/crop/best/Sharon_Sweda.jpg',
    name: 'Sharon Sweda (Dememocrat)',
    office: 'Ohio State Senate to represent District 13',
    comment: 'Sharon Sweda was born in Lorain, Ohio. Sweda\'s career experience includes owning American Patriot Title Agency.',
    url: window.location.href.trim(),
  },
  {
    photo: 'https://s3.amazonaws.com/ballotpedia-api/storage/uploads/thumbs/200/300/crop/best/Nickie_Antonio.jpg',
    name: 'Nickie Antoni (Democrat)',
    office: 'Ohio State Senate to represent District 23',
    comment: 'Nickie Antonio lives in Lakewood, Ohio. She earned a bachelor\'s degree in education from Cleveland State University and a master\'s degree in public administration from Cleveland State University in 1991. Antonio\'s career experience includes working as the president of Star Communications Consulting.',
    url: window.location.href.trim(),
  },
  {
    photo: 'https://s3.amazonaws.com/ballotpedia-api/storage/uploads/thumbs/200/300/crop/best/Adam_VanHo.jpg',
    name: 'Adam VanHo (Democrat)',
    office: 'Ohio State Senate to represent District 237',
    comment: 'Adam Vanho lives in Munroe Falls, Ohio. He graduated from Euclid High School. He earned a degree from Allegheny College and a law degree from Cleveland State University. VanHo\'s career experience includes working with the Ohio Attorney General\'s office and owning VanHo law.',
    url: window.location.href.trim(),
  },
  {
    photo: 'https://s3.amazonaws.com/ballotpedia-api/storage/uploads/thumbs/200/300/crop/best/barnet.JPG',
    name: 'Kevin Barnet (Democrat)',
    office: 'Ohio House of Representatives to represent District 1',
    comment: 'I strongly support Clean Air. Clean Water, and Renewable Energy. I have pledged not to take campaign donations or PAC money from utilities, pipeline and/or fracking companies. I believe that the health of our community, the health of our planet, and the economic growth in research, development, and implementation of renewable energy in Ohio and Wayne county is an outstanding opportunity. I also strongly support reasonable gun restrictions.',
    url: window.location.href.trim(),
  },
];

function candidatePanel(candidates, selector) {  // eslint-disable-line no-unused-vars
  if (candidates.length === 0) {
    candidates = demoCandidates;
  }
  for (let i = 0; i < candidates.length; i++) {
    candidatePane(i, candidates[i], selector);
  }
}

function topMenu() {  // eslint-disable-line no-unused-vars
  let topMarkup = "" +
    "<img id='orgLogo' src='https://www.sierraclub.org/sites/www.sierraclub.org/themes/pt/images/logos/sc-logo-green.svg'>" +
    "<b>Sierra Club</b>" +
    "<input type=\"text\" id='email' name='email' placeholder='Email' >" +
    "<input type=\"text\" id='topComment' name='topComment' placeholder='Comment here...' >" +
    "<button type='button' id='signIn' class='signInButton weButton noStyleWe'>SIGN IN</button>";
  $('#topMenu').append(topMarkup);
}

function candidatePane(i, candidate, selector) {
  let markup = "" +
    "<div class='candidate'>" +
      "<div class='unfurlable'>" +
        "<span class='unfurlableTopMenu'>" +
          "<img class='photo" + i + " noStyleWe' alt='candidate' src=" + candidate.photo + " />" +
          "<div class='nameBox" + i + "  noStyleWe'>" +
            "<div class='nameField" + i + " '>" + candidate.name + "</div>" +
            "<div class='titleField" + i + " '>" + candidate.office + "</div>" +
          "</div>" +
        "</span>" +
      "</div>" +
      "<div class='furlable'>" +
        "<span class='buttons'>" +
          "<button type='button' class='endorsedButton" + i + " weButton noStyleWe' >Endorsed</button>" +
          // "<button type='button' id='endorsedButton' class='fas fa-check' >Endorsed</button>" +
          "<button type='button' class='opposedButton" + i + " weButton noStyleWe' >Opposed</button>" +
          "<button type='button' class='infoButton" + i + " weButton noStyleWe' >Information Only</button>" +
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