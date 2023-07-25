class GitHubListener {
  constructor() {
    this.init();
  }

  init() {
    this.listen();
  }

  listen() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (
        tab.url &&
        tab.url.includes('https://github.com') &&
        changeInfo.status === 'complete'
      ) {
        // this.initGpt();
        console.log('tabId:', tabId, 'changeInfo:', changeInfo, 'tab:', tab);
        chrome.tabs.sendMessage(tabId, {
          command: 'githubOpen',
          payload: { url: tab.url, title: tab.title },
        });
      }
    });
  }
}

export default GitHubListener;
