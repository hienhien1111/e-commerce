module.exports = {
  prompt: ({ inquirer }) => {
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'What is the entity name (singular, PascalCase)?',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Entity name is required';
          }
          if (!/^[A-Z][a-zA-Z]*$/.test(input)) {
            return 'Entity name must be PascalCase (e.g., Product, OrderItem)';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'pluralName',
        message: 'What is the plural name? (optional, will auto-pluralize if empty)',
      },
      {
        type: 'list',
        name: 'moduleType',
        message: 'Which application module does this belong to?',
        choices: [
          { name: 'identity (auth, users, sessions)', value: 'identity' },
          { name: 'authorization (roles, permissions)', value: 'authorization' },
          { name: 'payment (TransFi integration)', value: 'payment' },
          { name: 'trading (Alpaca integration)', value: 'trading' },
          { name: '+ Create new module', value: 'new' },
        ],
      },
      {
        type: 'input',
        name: 'newModuleName',
        message: 'What is the new module name (kebab-case)?',
        when: (answers) => answers.moduleType === 'new',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Module name is required';
          }
          if (!/^[a-z][a-z-]*[a-z]$/.test(input) && !/^[a-z]+$/.test(input)) {
            return 'Module name must be kebab-case (e.g., notifications, user-settings)';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'addToDomain',
        message: 'Add entity to shared domain layer?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'addToInfrastructure',
        message: 'Add persistence (TypeORM entity, mapper, repository)?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'addController',
        message: 'Add REST controller and DTOs?',
        default: true,
      },
    ];

    return inquirer.prompt(questions).then((answers) => {
      const { name, pluralName, moduleType, newModuleName, addToDomain, addToInfrastructure, addController } = answers;

      const moduleName = moduleType === 'new' ? newModuleName : moduleType;

      const nameCamelCase = name.charAt(0).toLowerCase() + name.slice(1);
      const nameKebabCase = name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
      const nameUpperCase = name.toUpperCase();
      const nameSnakeCase = name
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase();

      const plural =
        pluralName ||
        (name.endsWith('y')
          ? name.slice(0, -1) + 'ies'
          : name.endsWith('s') || name.endsWith('x') || name.endsWith('ch') || name.endsWith('sh')
          ? name + 'es'
          : name + 's');
      const pluralCamelCase = plural.charAt(0).toLowerCase() + plural.slice(1);
      const pluralKebabCase = plural
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();

      const moduleNamePascalCase = moduleName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      return {
        ...answers,
        name,
        nameCamelCase,
        nameKebabCase,
        nameUpperCase,
        nameSnakeCase,
        plural,
        pluralCamelCase,
        pluralKebabCase,
        moduleName,
        moduleNamePascalCase,
        addToDomain,
        addToInfrastructure,
        addController,
        isNewModule: moduleType === 'new',
      };
    });
  },
};
