/* eslint-disable no-unused-vars */
const debugServiceWorker = false;
const debugStorageEvents = false;
const debugTimingServiceWorker = false;
const debugTimingForegroundContent = false;        // debugFgLog
const debugPopUpMessages = false;
const debugHilitorEnabled = false;              // This can tremendously slow down page processing
const debugHilitorMatchEnabled = false;


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

const colors = {
  POSS_SUPPORT_FOREGROUND: '#FFFFFF',
  POSS_SUPPORT_BACKGROUND: '#27af72',
  POSS_OPPOSE_FOREGROUND: '#FFFFFF',
  POSS_OPPOSE_BACKGROUND: '#fb6532',
  POSS_INFO_FOREGROUND: '#FFFFFF',
  POSS_INFO_BACKGROUND: '#7c7b7c',
  STORED_SUPPORT_FOREGROUND: '#28b074',
  STORED_SUPPORT_BACKGROUND: '#b4e7cd',
  STORED_OPPOSE_FOREGROUND: '#f16936',
  STORED_OPPOSE_BACKGROUND: '#f7c9b8',
  STORED_INFO_FOREGROUND: '#818082',
  STORED_INFO_BACKGROUND: '#dad8da',
  DELETED_FOREGROUND: '#aa0311',
  DELETED_BACKGROUND: '#f0c7c8',
};

const webAppChoice = 'quality';           // should be 'production' in git repository
const apiServerChoice = 'production';     // should be 'production' in git repository
const overrideStartingYear = false;       // Should be 'false' in git repository
const startingYearOverride = 2022;
const allowAnyYearForVoterGuides = false;
let webAppRoot = '';
let apiRoot = '';
let cdnRoot = '';
let extensionSrc = '';
switch (webAppChoice) {
  case 'production':
    webAppRoot = 'https://wevote.us'; break;
  case 'quality':
    webAppRoot = 'https://quality.wevote.us'; break;
  case 'developer':
    // webAppRoot = 'https://wevotedeveloper.com:3000'; break;
    webAppRoot = 'https://localhost:3000'; break;
}
switch (apiServerChoice) {
  case 'production':
    apiRoot = 'https://api.wevoteusa.org';
    cdnRoot = 'https://cdn.wevoteusa.org';
    extensionSrc = '';
    break;
  case 'developer':
    apiRoot = 'https://wevotedeveloper.com:8000';
    cdnRoot = 'https://wevotedeveloper.com:8000';
    extensionSrc = '/src';
    break;
}
const rootApiURL = `${apiRoot}/apis/v1`;
const rootCdnURL = `${cdnRoot}/apis/v1`;
const candidateExtensionWebAppURL = `${webAppRoot}/candidate-for-extension`;
const addCandidateExtensionWebAppURL = `${webAppRoot}/add-candidate-for-extension`;
const editCandidateExtensionWebAppURL = `${webAppRoot}/candidate-for-extension`;
const extensionWarmUpPage = `${webAppRoot}${extensionSrc}/extension.html`;
const extensionSignInPage = `${webAppRoot}/more/extensionsignin`;
const defaultNeverHighlightOn = ['*.wevote.us', 'api.wevoteusa.org', 'localhost', 'platform.twitter.com', '*.addthis.com', 'localhost'];
