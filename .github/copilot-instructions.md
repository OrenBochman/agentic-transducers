# Project general coding guidelines

## Background

This will be a project to build a web-based FSM playground using Lit and Vite. 
This educational resource will form the basis of a series of lessons on regular expressions
This will be incorporated into a larger project to create a modern clone of the popular Primer web-app.
But this time to teach stem concepts in a more interactive way.

use materials from https://developers.google.com/blockly/guides/get-started to get stated with Blockly.

## Tasks

1. [ ] create a lit js + vite based pwa using a web component called <fsm-playground> which supports building fsm and transducers.
then we can add lessons for regex, automata, tansducers, generation, parsing
2. [ ] add blockly and be like a Scratch playground but for FSMs and transducers.
3. [ ] create a workspace
        - add need Injection div
        - add injection code
```html
<div id="blocklyDiv" style="height: 480px; width: 600px;"></div>
```
        
```js
// Passes the ID.
const workspace = Blockly.inject('blocklyDiv', { /* config */ });

// Passes the injection div.
const workspace = Blockly.inject(
    document.getElementById('blocklyDiv'), { /* config */ });
```        

4. [ ] add a toolbox
5. [ ] define custom blocks for 
    - state - with transition slot for nested events with goto another state, - these should wire up to the state with that name.
    - start-state has no slot just next state field,
    - end-state, 
    - transitions with "on event" and "goto" fields, input field for automaton
    - transitions with "on event" and "goto" fields, input +  output field for transducer
    - transitions with "on event" and "goto" fields, emit field for automata
    - transition-p adds also has a probability field for non-deterministic FSMs
        - the last field always get the probability = 1 minus the sum of the other probabilities for that state.
6. web site utilities with 
    - play and stop button.
    - export import buttons for workspace xml
    - after an edit we should persist to local storage
    - on load or after refresh we should load from local storage . 


## Code Style

- Use semantic HTML5 elements (header, main, section, article, etc.)
- Prefer modern JavaScript (ES6+) features like const/let, arrow functions, and template literals

## Naming Conventions

- Use PascalCase for component names, interfaces, and type aliases
- Use camelCase for variables, functions, and methods
- Prefix private class members with underscore (_)
- Use ALL_CAPS for constants

## Code Quality

- Use meaningful variable and function names that clearly describe their purpose
- Include helpful comments for complex logic
- Add error handling for user inputs and API calls