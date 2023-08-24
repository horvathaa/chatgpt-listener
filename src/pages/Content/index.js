import { printLine } from './modules/print';
import ChatGptHandler from './modules/ChatGpt/ChatGptHandler';
import GitHubHandler from './modules/GitHub/GitHubHandler';
import StackOverflowHandler from './modules/StackOverflow/StackOverflowHandler';
import GoogleHandler from './modules/Google/GoogleHandler';

console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

printLine("Using the 'printLine' function from the Print Module");

// console.log(window.location.href);
new ChatGptHandler();
new GitHubHandler();
new StackOverflowHandler();
new GoogleHandler();
