export default {
  meta: {
    type: 'problem',
    messages: {
      noFetch:
        'Components must not use fetch(). Use a service instead.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const filename = context.getFilename();

        const isComponent =
          filename.includes('/components/') ||
          filename.includes('pm-');

        if (
          isComponent &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'fetch'
        ) {
          context.report({
            node,
            messageId: 'noFetch',
          });
        }
      },
    };
  },
};