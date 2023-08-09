const URL_COMMAND_MAP: { [k: string]: string } = {
  'https://www.google.com/': 'googleOpen',
  'https://stackoverflow.com': 'stackoverflowOpen',
  'https://github.com': 'githubOpen',
  'chat.openai': 'chatOpen',
};

class GenericListener {
  readonly keys = Object.keys(URL_COMMAND_MAP);
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
        this.keys.some((url) => tab.url?.includes(url)) &&
        // tab.url.includes(this.url) &&
        changeInfo.status === 'complete'
      ) {
        // this.initGpt();
        const key = this.keys.find((url) => tab.url?.includes(url)) as string;
        console.log('tabId:', tabId, 'changeInfo:', changeInfo, 'tab:', tab);
        chrome.tabs.sendMessage(tabId, {
          //   command: this.eventCommand,
          command: URL_COMMAND_MAP[key],
          payload: { url: tab.url, title: tab.title },
        });
      }
    });
  }
}

export default GenericListener;
