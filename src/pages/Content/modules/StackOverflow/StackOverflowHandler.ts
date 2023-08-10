import { WEB_INFO_SOURCE } from '../../../Background/firebase/FirestoreController';
import { Code } from '../GitHub/GitHubHandler';

const SELECTORS = {
  INNER_CONTENT: '.inner-content.clearfix',
  QA_CONTAINER: '[aria-label="question and answers"]',
  DATE_VIEW_COUNT_ROW: '.d-flex.fw-wrap.pb8.mb16.bb.bc-black-075',
  QUESTION_ID: '#question',
  POST_BODY: '.s-prose.js-post-body',
  TAG_LIST:
    '.post-layout > .postcell > .mt24.mb12 > .post-taglist > .ps-relative > ul',
  REPLIES: (id: string) => `#comments-${id} > ul`,
  REPLY_TIME: `.comment-body > .comment-date > a > span`,
  REPLY_CLASS: 'comment-text',
  ANSWERS: '#answers',
  ANSWER_CLASS: 'answer',
  ANSWER_ID: (id: string) => `#answer-${id}`,

  ANSWER_CONTAINER: (id: string) =>
    `#answer-${id} > .post-layout > .answercell`,
  ANSWER_NOT_ACCEPTED: '.votecell > .js-voting-container > .d-none',
  ANSWER_BODY: `.s-prose.js-post-body`,
  ANSWER_TIME: (id: string) =>
    `#answer-${id} > .user-info.user-hover > .user-action-time > span`,
  ANSWER_TIME_CREATED: `.mt24 > div > time`,
  tempAnswer1: `.mt24 > div `,
  tempAnswer2: `.mt24 > div > .post-signature `,
  tempAnswer3: `.mt24 > div > .post-signature > .user-info > .user-action-time > a > span`,
  ANSWER_TIME_EDITED: `.mt24 > div > .post-signature > .user-info > .user-action-time > a > span`,
  ANSWER_URL: (id: string) => `#answer-${id} > .js-share-link`,
  // ANSWER_REPLIES: (id: string) => `#comments-${id} > ul`,
};

const VIEW_COUNT_REGEX = /\b\d{1,3}(,\d{3})*\b/;

enum WARNINGS {
  NO_ANSWER_ID = "Couldn't parse answer",
  NO_ANSWER_BODY = "Couldn't parse answer body",
  NO_QUESTION_ID = "Couldn't parse question",
  NO_QUESTION_BODY = "Couldn't parse question body",
}

interface StackOverflowPost {
  body: string;
  votes: number;
  postDate: Date;
}

interface StackOverflowQuestion extends StackOverflowPost {
  title: string;
  // body: string;
  // votes: number;
  tags: string[];
  answers: StackOverflowAnswer[];
  // askDate: Date;
  lastEditDate?: Date;
  views: number;
  programmingLanguage: string;
  id: string;
  copied?: boolean;
  replies?: StackOverflowPost[];
  warning?: WARNINGS | WARNINGS[];
}

interface StackOverflowAnswer extends StackOverflowPost {
  // body: string;
  // votes: number;
  isAccepted: boolean;
  // answerDate: Date;
  lastEditDate?: Date;
  url: string;
  id: string;

  copied?: boolean;
  replies?: StackOverflowPost[];
  warning?: WARNINGS | WARNINGS[];
}

class StackOverflowHandler {
  _copiedCode: Code | undefined;
  _question: StackOverflowQuestion | undefined;
  private readonly _loadTime: Date = new Date();
  private _url: string = 'https://stackoverflow.com';
  private _title: string = 'Stack Overflow';
  constructor() {
    this.init();
  }

  init() {
    this.listen();
  }

  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.command === 'stackoverflowOpen') {
        const { url, title } = request.payload;
        if (url.includes('/questions/')) {
          this._url = url;
          this._title = title;
          this.handleQuestion(url, title);
        }
      }
    });
  }

  handleQuestion(url: string, title: string) {
    this._question = this.parseQuestion(url, title);
  }

  // add field in metadata of which of the answers or q's was copied from
  // can probably double check with element id
  initCopyCodeListeners(el: Element, parentId: string) {
    Array.from(el.children).forEach((c) => {
      if (c.tagName === 'PRE') {
        c.addEventListener('copy', (e) => {
          const copiedMessage =
            this._question?.id === parentId
              ? this._question
              : this._question?.answers.find((a) => a.id === parentId);
          console.log('sending this', {
            command: 'copyCode',
            payload: {
              code: window.getSelection()?.toString(),
              url: this._url,
              additionalMetadata: {
                title: this._title,
                question: this._question,
                surroundingCode: (c as HTMLElement).innerText,
                copiedMessage,
              },
              type: WEB_INFO_SOURCE.STACKOVERFLOW,
            },
          });
          chrome.runtime.sendMessage({
            message: 'copyCode',
            payload: {
              code: window.getSelection()?.toString(),
              url: this._url,
              additionalMetadata: {
                title: this._title,
                question: this._question,
                surroundingCode: (c as HTMLElement).innerText,
                copiedMessage,
              },
              type: WEB_INFO_SOURCE.STACKOVERFLOW,
            },
          });
        });
      }
    });
  }

  getComments(id: string, el: Element) {
    const replyEls = el.querySelector(SELECTORS.REPLIES(id));
    // console.log('replyEls', replyEls);
    const children = replyEls?.children;
    if (!children) return [];
    const replies = Array.from(children).flatMap((c) => Array.from(c.children));
    // console.log('replies', replies);
    const formattedReplies = replies
      .filter((r) => {
        return r.classList.contains(SELECTORS.REPLY_CLASS);
      })
      .map((reply) => {
        const neighbor = reply.previousElementSibling;
        const replyTime = reply.querySelector(SELECTORS.REPLY_TIME);
        // console.log('replyTime', replyTime);
        const time = (replyTime as HTMLElement)?.title.split(',')[0]; // this is so bad
        return {
          body: (reply as HTMLElement).innerText,
          votes: parseInt((neighbor as HTMLElement).innerText || '0'),
          postDate: new Date(
            time
            // (reply.querySelector('time') as HTMLElement).innerText
          ),
        };
      });
    return formattedReplies;
  }

  getQuestionDetails(question: StackOverflowQuestion, questionEl: Element) {
    const score = (questionEl as HTMLElement).dataset.score;
    const postBody = questionEl.querySelector(
      SELECTORS.POST_BODY
    ) as HTMLElement;
    if (!postBody) return { ...question, warning: WARNINGS.NO_QUESTION_BODY };
    const questionBody = postBody?.innerText;
    if (Array.from(postBody.children).some((c) => c.tagName === 'PRE')) {
      this.initCopyCodeListeners(postBody, question.id);
    }
    // console.log('questionEl', questionEl, 'questionBody', questionBody);
    const tags = questionEl.querySelector(SELECTORS.TAG_LIST);
    // console.log('tags', tags);
    const questionTags =
      tags &&
      Array.from(tags.children).map((tag) => (tag as HTMLElement).innerText);
    const questionReplies = this.getComments(question.id, questionEl);
    return {
      ...question,
      body: questionBody || '',
      votes: parseInt(score || '0'),
      tags: questionTags || [],
      replies: questionReplies,
    };
  }

  getAskModifyView(question: StackOverflowQuestion, el: HTMLCollection) {
    const [ask, modify, view] = Array.from(el);
    // console.log('ask', ask, 'modify', modify, 'view', view);
    const modifyDate = modify.querySelector('a')?.title;
    const askDate = new Date((ask as HTMLElement).title);
    const lastEditDate = new Date(modifyDate || askDate);
    const viewCount = (view as HTMLElement).title.match(VIEW_COUNT_REGEX);
    const views = viewCount ? parseInt(viewCount[0].replaceAll(',', '')) : 0;
    return { ...question, postDate: askDate, lastEditDate, views };
  }

  getTimes(el: Element, id: string) {
    let obj: { [k: string]: Date } = {
      postDate: this._loadTime,
      // lastEditDate: this._loadTime,
    };

    const lastEditDate = el.querySelector(SELECTORS.ANSWER_TIME_EDITED);

    if (lastEditDate) {
      obj = {
        ...obj,
        lastEditDate: new Date((lastEditDate as HTMLElement).title),
      };
    }
    const postDate = el.querySelector(SELECTORS.ANSWER_TIME_CREATED);
    if (postDate) {
      obj.postDate = new Date((postDate as HTMLTimeElement).dateTime);
    }
    // console.log('obj', obj);
    return obj;
  }

  parseAnswer(answer: HTMLElement): StackOverflowAnswer {
    const answerId = answer.dataset.answerid;
    if (!answerId)
      return {
        body: '',
        votes: 0,
        isAccepted: false,
        url: '',
        replies: [],
        id: '',
        postDate: new Date(),
        warning: WARNINGS.NO_ANSWER_ID,
      };
    const answerContainer = answer.querySelector(
      SELECTORS.ANSWER_CONTAINER(answerId)
    );
    if (!answerContainer)
      return {
        body: '',
        votes: 0,
        isAccepted: false,
        url: '',
        replies: [],
        id: '',
        postDate: new Date(),
        warning: WARNINGS.NO_ANSWER_BODY,
      };
    const isAccepted =
      answerContainer.parentElement?.querySelector(
        SELECTORS.ANSWER_NOT_ACCEPTED
      ) === null;
    const answerBodyEl = answerContainer?.querySelector(SELECTORS.ANSWER_BODY);
    // console.log('answerBodyEl', answerBodyEl);
    if (!answerBodyEl)
      return {
        body: '',
        votes: 0,
        isAccepted: false,
        url: '',
        replies: [],
        id: '',
        postDate: new Date(),
        warning: WARNINGS.NO_ANSWER_BODY,
      };
    if (Array.from(answerBodyEl.children).some((c) => c.tagName === 'PRE')) {
      this.initCopyCodeListeners(answerBodyEl, answerId);
    }
    const answerBody = (answerBodyEl as HTMLElement).innerText;
    const { postDate, lastEditDate } = this.getTimes(answer, answerId);
    // console.log('lastEditDate in answer', lastEditDate);
    const answerUrl = `https://stackoverflow.com/a/${answerId}`;
    const answerReplies = this.getComments(answerId, answer);
    return {
      body: answerBody || '',
      votes: parseInt(answer.dataset.score || '0'),
      isAccepted,
      lastEditDate,
      postDate,
      url: answerUrl,
      replies: answerReplies,
      id: answerId,
    };
  }

  parseAnswers(answers: Element) {
    const answerEls = Array.from(answers.children).filter((a) =>
      a.classList.contains(SELECTORS.ANSWER_CLASS)
    );
    // console.log('answerEls', answerEls);
    const answerDetails = answerEls
      .map((answerEl) => {
        return this.parseAnswer(answerEl as HTMLElement);
      })
      .filter((a) => !a.warning);
    // console.log('answers!!!!!!!!', answerDetails);
    return answerDetails;
  }

  // ensure all of the fields are filled out and have reasonable data
  validateQuestion(question: StackOverflowQuestion) {}

  parseQuestion(url: string, title: string): StackOverflowQuestion {
    const [language, questionTitle] = title.split(' - ');
    const questionId = url.split('/')[4];
    const innerContent = document.querySelector(SELECTORS.INNER_CONTENT);
    let question: StackOverflowQuestion = {
      title: questionTitle,
      programmingLanguage: language,
      id: questionId,
      tags: [],
      answers: [],
      views: 0,
      lastEditDate: this._loadTime,
      postDate: this._loadTime,
      body: '',
      votes: 0,
      // warning: WARNINGS.NO_QUESTION_ID,
    };
    if (innerContent) {
      const questionAskModifyView = innerContent.querySelector(
        SELECTORS.DATE_VIEW_COUNT_ROW
      );
      const questionAskModifyViewChildren = questionAskModifyView?.children;
      if (questionAskModifyViewChildren) {
        question = this.getAskModifyView(
          question,
          questionAskModifyViewChildren
        );
      }
      const questionEl = innerContent.querySelector(SELECTORS.QUESTION_ID);
      if (questionEl) {
        question = this.getQuestionDetails(question, questionEl);
      }
      const answers = innerContent.querySelector(SELECTORS.ANSWERS);
      // console.log('answers', answers);
      if (answers) {
        const answerDetails = this.parseAnswers(answers);
        question.answers = answerDetails;
      }
    }
    console.log('question', question);
    this.validateQuestion(question);
    return question;
  }
}

export default StackOverflowHandler;
