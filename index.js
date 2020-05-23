import acorn from 'acorn';
import fs from 'fs';
import esquery from 'esquery';
import escodegen from 'escodegen';
import estraverse from 'estraverse';
import _ from 'lodash';
const { query } = esquery;

const jsFile = fs.readFileSync('./samples/sample1.js');
let ast = acorn.parse(jsFile, { sourceType: 'module' });

// Step 1: find states
// console.log(JSON.stringify(query(ast, 'ExportNamedDeclaration VariableDeclaration'), 0, 2));
const states = _(query(ast, 'ExportNamedDeclaration VariableDeclaration'))
  .flatMap(({ declarations }) => declarations)
  .map(declaration => declaration?.id?.name)
  .value();
console.log('Step 1: find states', states);
console.log('\n');


// Step 2: find mutations of states
const mutations = query(ast, 'AssignmentExpression')
  .filter(node => states.includes(node?.left?.name));

console.log('Step 2: find mutations of states', mutations);
console.log('\n');


// Step 3: inject view updation code per mutation
mutations.forEach(node => {
  const { name } = node.left;
  const currentCode = escodegen.generate(node);
  const replaced = acorn.parse(`${currentCode}; __update__(${JSON.stringify(name)}, ${name})`);
  ast = estraverse.replace(ast, {
    enter: travNode => {
      if (travNode === node) {
        return replaced;
      }
    }
  });
});

console.log('Step 3: inject update logic after mutation of state');
console.log('---------------');
console.log(escodegen.generate(ast));
console.log('---------------');
