export enum COMMANDS {
  GOOGLE_OPEN = 'googleOpen',
  STACKOVERFLOW_OPEN = 'stackoverflowOpen',
  GITHUB_OPEN = 'githubOpen',
  CHAT_OPEN = 'chatOpen',
  OTHER_OPEN = 'otherOpen',
  GOOGLE_SEARCH = 'googleSearch',
}

const URL_COMMAND_MAP: { [k: string]: COMMANDS } = {
  'https://www.google.com/': COMMANDS.GOOGLE_OPEN,
  'https://stackoverflow.com': COMMANDS.STACKOVERFLOW_OPEN,
  'https://github.com': COMMANDS.GITHUB_OPEN,
  'chat.openai': COMMANDS.CHAT_OPEN,
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
        if (!key) {
          chrome.tabs.sendMessage(tabId, {
            command: COMMANDS.OTHER_OPEN,
            payload: { url: tab.url, title: tab.title },
          });
        } else {
          console.log('tabId:', tabId, 'changeInfo:', changeInfo, 'tab:', tab);
          chrome.tabs.sendMessage(tabId, {
            //   command: this.eventCommand,
            command: URL_COMMAND_MAP[key],
            payload: { url: tab.url, title: tab.title },
          });
        }
      }
    });
  }
}

export default GenericListener;
