import '../../assets/img/icon-34.png';
import '../../assets/img/icon-128.png';
import ChatGptListener from './modules/ChatGptListener';
import GitHubListener from './modules/GitHubListener';
import FirestoreController from './firebase/FirestoreController';
import StackOverflowListener from './modules/StackOverflowListener';
import GenericListener from './modules/GenericListener';

console.log('This is the background page.');
console.log('Put the background scripts here.');
// new ChatGptListener();
// new GitHubListener();
// new StackOverflowListener();

export const listener = new GenericListener();
export const firestore = FirestoreController.create();
