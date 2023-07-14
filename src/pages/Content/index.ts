import { printLine } from './modules/print';

console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

printLine("Using the 'printLine' function from the Print Module");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  console.log('Current Tab:', tabs[0].url);
});
