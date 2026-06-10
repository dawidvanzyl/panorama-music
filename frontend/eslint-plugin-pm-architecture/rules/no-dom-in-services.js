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
        const filename = context.getFilename();

        const isService = filename.includes('/services/');
        if (!isService) return;

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