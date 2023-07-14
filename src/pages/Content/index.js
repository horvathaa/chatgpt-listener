import { printLine } from './modules/print';
import ChatGptHandler from './modules/chatGptHandler';

console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

printLine("Using the 'printLine' function from the Print Module");

// console.log(window.location.href);
new ChatGptHandler();
