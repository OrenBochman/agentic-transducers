# Project general coding guidelines

## Background

This will be a project to build a web-based PWA for teaching Computer Science topic via coding using blockly, visual programming and real code.
This is a mobile first experience so the PWA should include a service worker and manifest so it can be installed on mobile devices and work offline.
The app should support saving to local storage and exporting/importing workspaces as XML/JSON files and storing to the Google Drive API.

## Primer philosophy

<!-- Bite sized Lessons to develop problem solving skills and structured as a DAGs with series of **interactive** activities exercises with quizzes and challenges to test understanding and provide feedback. The DAGs structure is meant to be adaptive to different levels of prior knowledge and student learning styles. Good students should be challenged weak students should start with more basic excercises and progress towards the final assesment's levels. -->
A chat agent may prompt the user if stuck or low engagement. The agents goal is to elicit the users difficulties and to suggest alternative navigation paths through the DAG and if neccessary to make additions to the DAG to personalize the learning experience and to address the users difficulties. 
These can be pushed back to the the online repository to improve the experience for future users.
The app should contain telemetry and logging to support RL based personalization and improvement of the learning experience.
There is also a final challenge or quiz at the end of each lesson to provide standardized assessment of learning outcomes.
RL + LLM may customize the lesson content using a DAG structure to adapt to the learner's progress and preferences, providing a personalized learning path through the material.

## Topics

1. Finite State Machines 
    - DFA 
    - NFA
    - Transducers
    - Regular Expressions
    - Epsilon transitions
    - Approximate matching with edit distance
    - Transduecers with output and state dependent output
        - Translation 
        - Generation
        - Tagging
    - Tree automata
        - use railroad diagrams cf. https://bottlecaps.de/rr/ui
    - Pushdown automata & Context free grammars


2. Flow charts (exists) + Introduction to programming concepts like variables, loops, conditionals, functions, etc.
3. SQL (exists)
4. Queuing theory
5. Semaphores and concurrency - perhaps based on the little book of semaphores.
    - basicaly blockly with semaphore blocks and a visualizer for the state of the semaphores and the processes waiting on them..


Once a play-ground is constructed it should be integrated into lessons with quizzes using a primer style app.


FSM playground using Lit and Vite. 
This educational resource will form the basis of a series of lessons on regular expressions
This will be incorporated into a larger project to create a modern clone of the popular Primer web-app.
But this time to teach stem concepts in a more interactive way.

use materials from https://developers.google.com/blockly/guides/get-started to get stated with Blockly.

## Tasks


1. [ ] init create a lit js + vite based pwa
2. [ ] create an app level component called <fsm-playground> 
    1. it should have<toolbox> web component for the toolbox
    1. it should have a web component for the blockly workspace
    2. it should include a div for the graph view
    3. it should have a web component for input.
    4. it should include a status bar div


Notes: After the first iteration I think that Blockly isn't ideal for FSM which are node based.

which supports building fsm and transducers.
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

4. [ ] add a toolboxes
    - determinstic finite state machines 
    - non-deterministic finite state machines 
    - automata
    - for transducers
    - for regexes
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
    - play and stop button - shows the animated execution of the FSM or transducer on a given input string - current state is highlighted, current input symbol is highlighted, and for transducers current output is also shown.
    - export import buttons for workspace xml
    - after an edit we should persist to local storage
    - on load or after refresh we should load from local storage . 
7. status bar.
    - shows the current state, current input symbol, and for transducers current output.
    - shows validation issues - duplicate state names, transitions to non-existent states, unreachable states, non-deterministic transitions without probabilities, etc.
8. graph view - shows a visual graph of the FSM or transducer using something like d3 or vis.js, with states as nodes and transitions as edges.
   This should be uneccessary if we can wire up the blocks and use a graph layout algorithm to automatically layout the blocks in a visually appealing way


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