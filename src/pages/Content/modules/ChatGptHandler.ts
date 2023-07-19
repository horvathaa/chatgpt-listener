import ChatGptThread from './ChatGptThread/ChatGptThread';

class ChatGptHandler {
  _threads: Map<string, ChatGptThread> = new Map();
  _activeThread: ChatGptThread | null = null;
  constructor() {
    this.init();
  }

  init() {
    this.listen();
  }

  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.command === 'chatOpen') {
        const { url, title } = request.payload;
        if (!this._threads.has(url)) {
          const newThread = new ChatGptThread(url, title);
          this._threads.set(url, newThread);
          this._activeThread?.destroyPageObserver();
          this._activeThread = newThread;
        } else {
          const thread = this._threads.get(url);
          if (thread) {
            this._activeThread?.destroyPageObserver();
            thread.initPageObserver();
            this._activeThread = thread;
          }
        }
      }
    });
  }
}

export default ChatGptHandler;
