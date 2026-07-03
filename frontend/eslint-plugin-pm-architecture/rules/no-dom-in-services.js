export default {
  meta: {
    type: 'problem',
    messages: {
      noDom:
        'Services must not access DOM. Move UI logic to components.',
    },
  },

  create(context) {
    return {
      MemberExpression(node) {
        const filename = context.filename.replace(/\\/g, '/');

        const isService = filename.includes('/services/');
        const isTest = filename.includes('__tests__') || filename.includes('.test.') || filename.includes('.spec.');
        if (!isService || isTest) return;

        const objectName = node.object?.name;

        if (objectName === 'document' || objectName === 'window') {
          context.report({
            node,
            messageId: 'noDom',
          });
        }
      },
    };
  },
};