# Project general coding guidelines

## Background

This will be a project to build a web-based FSM playground using Lit and Vite. 
This educational resource will form the basis of a series of lessons on regular expressions
This will be incorporated into a larger project to create a modern clone of the popular Primer web-app.
But this time to teach stem concepts in a more interactive way.

## Tasks

1. [x] create a lit js + vite based pwa using a web component called <fsm-playground> which supports building fsm and transducers.
then we can add lessons for regex, automata, tansducers, generation, parsing
2. [x] This should be based on blockly elements and similar to Scratch playground but for FSMs and transducers. 
3. [ ] This means we want to cover what we should aim to cover material on the level of https://www.youtube.com/watch?v=hNhI6-qM454 .
2. [x] add logging and error handling to the component
3. [x] document project using mermaid  


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