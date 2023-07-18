import ChatGptThread from './ChatGptThread/ChatGptThread';

// add in code to get the name of each thread
class ChatGptHandler {
  _threads: Map<string, ChatGptThread> = new Map();
  _activeThread: ChatGptThread | null = null;
  constructor() {
    this.init();
  }

  init() {
    this.listen();
  }

  // initNavListener() {
  //   const targetNode: Node | Element | null = document.body.querySelector(
  //     // '.flex-col.text-sm.dark\\:bg-gray-800' // not sure if this will remain constant...
  //     'nav > .flex-col.flex-1.transition-opacity.duration-500.overflow-y-auto'
  //   );
  //   if (targetNode) {
  //     const config: MutationObserverInit = { childList: true, subtree: true };
  //     const observer = new MutationObserver(this.handleMessages);
  //     observer.observe(targetNode, config);
  //   } else {
  //     setTimeout(() => this.initNavListener(), 1000);
  //   }
  // }

  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // console.log('request:', request, 'sender:', sender);
      if (request.command === 'chatOpen') {
        // console.log('this._threads', this._threads);
        // window.onload = () => {
        // document.addEventListener('DOMContentLoaded', () => {
        // console.log('request:', request, 'threads', this._threads);
        if (!this._threads.has(request.payload)) {
          // setTimeout(() => {
          // console.log('making a new thread');
          const newThread = new ChatGptThread(request.payload);
          // console.log('new thread', newThread);
          this._threads.set(request.payload, newThread);
          this._activeThread?.destroyPageObserver();
          this._activeThread = newThread;
          // }, 3000);
        } else {
          const thread = this._threads.get(request.payload);
          // console.log('getting thread', thread);
          if (thread) {
            thread.initPageObserver();
            this._activeThread?.destroyPageObserver();
            this._activeThread = thread;
          }
        }
        // };
        // });
      }
    });
  }
}

export default ChatGptHandler;
