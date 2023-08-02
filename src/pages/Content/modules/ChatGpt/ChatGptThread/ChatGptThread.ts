import { WEB_INFO_SOURCE } from '../../../../Background/firebase/FirestoreController';

export function debounce(func: Function, timeout = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: [args: any]) => {
    clearTimeout(timer);
    // @ts-ignore
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

enum HowCopied {
  BUTTON = 'BUTTON',
  SELECTION = 'SELECTION',
}

interface CodeBlock {
  code: string;
  codeRef: HTMLElement;
  copied: boolean;
  surroundingText: string;
  language: string;
  parentId: string;
}

interface ThreadPair {
  id: string;
  time: number;
  userMessage: string;
  botResponse: string;
  codeBlocks: CodeBlock[];
}

// webpage qualities we listen for that may change (probably will change) at some point
const SELECTORS = {
  THREAD_CONTAINER: '.flex-col.text-sm.dark\\:bg-gray-800',
  TEXTAREA: '#prompt-textarea',
  COPY_TEXT: 'Copy code',
  COPIED_TEXT: 'Copied!',
};

class ChatGptThread {
  _observer: MutationObserver | null = null;
  _threadItems: ThreadPair[] = [];
  _botRef: HTMLElement | null = null;
  _userRef: HTMLElement | null = null;
  _tempUserMessage: string | null = null;
  _tempPair: ThreadPair | null = null;
  _lastEditedTime: NodeJS.Timeout | null = null;
  _botObserver: MutationObserver | null = null;
  constructor(readonly _id: string, readonly _title: string) {
    this.init();
  }

  init() {
    // console.log('calling initPageObserver');
    this.initPageObserver();
  }

  // get user's input values into the "send a message" box
  listenForUserText() {
    const targetNode: HTMLElement | null = document.body.querySelector(
      SELECTORS.TEXTAREA
    );
    if (targetNode) {
      targetNode.addEventListener('input', debounce(this.handleUserInput, 100));
    }
  }

  handleUserInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const value = target.value;
    this._tempUserMessage = value;
  };

  // set up top-level DOM observer, which will notify when new divs are added to the list of messages
  // indicating that a message has been sent
  // built in timer such that, if the page has not been updated with the list of divs as a user switches between chats
  // will re-run -- also will make sure we are looking at the correct div by checking the ID we add to the top level div
  initPageObserver() {
    const targetNode: HTMLElement | null = document.body.querySelector(
      SELECTORS.THREAD_CONTAINER
    );
    if (targetNode && (targetNode.id === this._id || targetNode.id === '')) {
      targetNode.setAttribute('id', this._id);
      if (!this._threadItems.length) {
        this.initThreadItems(targetNode);
      }
      const config: MutationObserverInit = {
        childList: true,
        subtree: true,
      };
      this._observer = new MutationObserver(this.handleMessages);
      this._observer.observe(targetNode, config);
      this.listenForUserText();
    } else {
      setTimeout(() => this.initPageObserver(), 5000);
    }
  }

  // reset vars for given message
  private reset() {
    this._userRef = null;
    this._botRef = null;
    this._tempPair = null;
    this._tempUserMessage = null;
    this._botObserver?.disconnect();
  }

  // handle ongoing thread
  addToThread(mutationsList: MutationRecord[], observer: MutationObserver) {
    this._tempPair = this._tempPair || {
      id: `${new Date().getTime().toString()}-${this._tempUserMessage}`,
      time: new Date().getTime(),
      userMessage: '',
      botResponse: '',
      codeBlocks: [],
    };

    const addedNodes = mutationsList
      .filter((m) => m.addedNodes && m.addedNodes.length > 0)
      .flatMap((m) => Array.from(m.addedNodes.values()));
    const hasPre = addedNodes.some((n) => n.nodeName === 'PRE');
    if (hasPre) {
      const preNode = addedNodes.find(
        (n) => n.nodeName === 'PRE'
      ) as HTMLElement;
      const codeBlock = this.makeCodeBlock(preNode, this._tempPair.id);
      this._tempPair = {
        ...this._tempPair,
        codeBlocks: [...this._tempPair.codeBlocks, codeBlock],
      };
    }
    this._lastEditedTime && clearTimeout(this._lastEditedTime);
    this._lastEditedTime = setTimeout(() => {
      const codeBlocks = this._tempPair?.codeBlocks.map((c) =>
        this.updateCodeBlock(c)
      );
      this._tempPair = {
        ...this._tempPair,
        userMessage: this._userRef?.innerText || '',
        botResponse: this._botRef?.innerText || '',
        id: this._tempPair?.id || new Date().getTime().toString(),
        time: this._tempPair?.time || new Date().getTime(),
        codeBlocks: codeBlocks || [],
      };
      // console.log('this', this);

      this._threadItems.push(this._tempPair);
      console.log('new thread items', this._threadItems);
      this.reset();
    }, 5000);
  }

  // top-level message handler which establishes DOM mutation observer for bot response message
  handleMessages: MutationCallback = (
    mutationsList: MutationRecord[],
    observer: MutationObserver
  ) => {
    if (!mutationsList.length || mutationsList.length === 1) return;
    mutationsList.forEach((mutation) => {
      // console.log('parent mutation', mutation);
      if (
        mutation.addedNodes &&
        Array.from(mutation.addedNodes.values()).some(
          (n) =>
            (n as HTMLElement).innerText === this._tempUserMessage &&
            this._tempUserMessage.length
        )
      ) {
        const addedNodes = Array.from(mutation.addedNodes.values());
        // console.log('addedNodes', addedNodes, 'this', this);
        // find user message given text value
        const nodeWithMessage = addedNodes.find(
          (n) =>
            (n as HTMLElement).innerText === this._tempUserMessage &&
            this._tempUserMessage.length
        ) as HTMLElement;
        if (nodeWithMessage) {
          this._userRef = nodeWithMessage;
          this._botRef = nodeWithMessage.nextSibling as HTMLElement;

          this._botObserver = new MutationObserver((mutations, observer) =>
            this.addToThread(mutations, observer)
          );
          this._botObserver.observe(
            nodeWithMessage.nextSibling as HTMLElement,
            {
              childList: true,
              subtree: true,
              characterData: true,
            }
          );
        }
      }
    });
  };

  // ingest already-existing messages
  private initThreadItems(targetNode: HTMLElement) {
    targetNode.childNodes.forEach((node, i) => {
      if (i % 2 === 0) {
        const userMessage = (node as HTMLElement).innerText;
        let botMessage = '';
        let codeBlocks: CodeBlock[] = [];
        const id = `${new Date().getTime().toString()}-${userMessage}`;
        if (targetNode.childNodes.length > i + 1) {
          const nextNode = targetNode.childNodes[i + 1] as HTMLElement;
          botMessage = nextNode.innerText;
          const preNodes = nextNode.querySelectorAll('pre');
          codeBlocks = Array.from(preNodes).map((preNode) =>
            this.makeCodeBlock(preNode as HTMLElement, id)
          );
        }
        const pair: ThreadPair = {
          id,
          time: new Date().getTime(),
          userMessage,
          botResponse: botMessage,
          codeBlocks,
        };
        this._threadItems.push(pair);
      }
    });
  }

  // disconnect top-level observer
  destroyPageObserver() {
    this._observer?.disconnect();
  }

  // attach listeners to code blocks
  private attachListeners(preNode: HTMLElement, parentId: string) {
    const button = preNode.querySelector('button');
    button?.addEventListener('click', (e: Event) =>
      this.handleCopy(e, preNode, HowCopied.BUTTON, parentId)
    );
    preNode.oncopy = (e) =>
      this.handleCopy(e, preNode, HowCopied.SELECTION, parentId);
  }

  private handleCopy = (
    e: Event,
    preNode: HTMLElement,
    howCopied: HowCopied,
    parentId: string
  ) => {
    console.log('e', e);
    if (navigator.clipboard && navigator.clipboard.readText) {
      // Read the text from the clipboard
      navigator.clipboard
        .readText()
        .then((text) => {
          let textToSend = '';
          // if user clicked the "copy code" button, ensure the text content matches the code block
          if (howCopied === HowCopied.BUTTON) {
            console.log('text', text, 'preNode', preNode.innerText);
            const splitter = preNode.innerText.includes(SELECTORS.COPY_TEXT)
              ? SELECTORS.COPY_TEXT
              : SELECTORS.COPIED_TEXT;
            const cleanText = preNode.innerText.split(splitter)[1].trim() || '';
            if (text.trim() !== cleanText.trim()) {
              textToSend = cleanText;
            } else {
              textToSend = text;
            }
          }
          // if user copied using the keyboard shortcut, ensure the text content matches their selection
          else if (howCopied === HowCopied.SELECTION) {
            const selection = window.getSelection();
            if (selection) {
              textToSend =
                text.trim() === selection.toString().trim()
                  ? text
                  : selection.toString();
            }
            // if for some reason we cannot get the select text, just send the clipboard text
            else {
              textToSend = text;
            }
          }
          // Access the text read from the clipboard
          console.log('Clipboard text:', text);
          chrome.runtime.sendMessage({
            message: 'copyCode',
            payload: {
              additionalMetadata: {
                messageCopied: this._threadItems.find((t) => t.id === parentId),
                thread: this,
              },
              code: textToSend,
              url: window.location.href,
              type: WEB_INFO_SOURCE.CHAT_GPT,
            },
          });
          // Use the text as needed
        })
        .catch((error) => {
          // Handle any errors that occur during reading
          console.error('Error reading from clipboard:', error);
        });
    } else {
      // Clipboard API not supported by the browser
      console.error('Clipboard API not supported');
    }
    if (howCopied === HowCopied.BUTTON) {
      // since button is dynamically created and destroyed on copy, re-attach the listener once the button
      // has been recreated
      setTimeout(() => {
        this.attachListeners(preNode, parentId);
      }, 4000);
    }
  };

  updateCodeBlock(codeBlock: CodeBlock) {
    const innerText = codeBlock.codeRef.innerText;
    return { ...codeBlock, code: innerText };
  }

  // init code block object
  private makeCodeBlock(preNode: HTMLElement, parentId: string): CodeBlock {
    // const codeNode = preNode?.querySelector('code');
    console.log('preNode', preNode, 'preNode.innerText', preNode.innerText);
    const code = preNode?.innerText || '';
    const codeRef = preNode as HTMLElement;
    const surroundingText = codeRef?.innerText || '';
    const language = preNode?.innerText.split(' ')[0] || '';
    const codeBlock = {
      code,
      codeRef: preNode,
      copied: false,
      surroundingText,
      language,
      parentId,
    };
    // console.log('adding this', codeBlock);
    this.attachListeners(preNode, parentId);
    return codeBlock;
  }
}

export default ChatGptThread;

// generic function to create a mutation observer
// createObserver(
//   functionToApply: MutationCallback,
//   selection: string,
//   node = document.body
// ) {
//   const foundNode = node.querySelector(selection);
//   if (foundNode) {
//     const config: MutationObserverInit = { childList: true, subtree: true };
//     const observer = new MutationObserver(functionToApply);
//     observer.observe(node, config);
//     return observer;
//   } else {
//     setTimeout(
//       () => this.createObserver(functionToApply, selection, node),
//       1000
//     );
//   }
// }
