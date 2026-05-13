module.exports = [
  {
    type: 'input',
    name: 'name',
    message:
      "What is the bounded context name? (kebab-case singular, e.g. 'billing', 'analytics')",
    validate: (input) => {
      if (!input || !/^[a-z][a-z0-9-]*[a-z0-9]$/.test(input)) {
        return 'Name must be kebab-case starting with a letter (e.g. billing, my-context).';
      }
      return true;
    },
  },
  {
    type: 'input',
    name: 'sampleEntity',
    message:
      "Sample aggregate name within the context? (PascalCase, e.g. 'Invoice')",
    initial: (answers) =>
      answers.name
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(''),
  },
];
