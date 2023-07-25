import '../../assets/img/icon-34.png';
import '../../assets/img/icon-128.png';
import ChatGptListener from './modules/ChatGptListener';
import GitHubListener from './modules/GitHubListener';
import FirestoreController from './firebase/FirestoreController';

console.log('This is the background page.');
console.log('Put the background scripts here.');
new ChatGptListener();
new GitHubListener();
FirestoreController.create();
