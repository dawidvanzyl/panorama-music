function getFeatureFromPath(filePath) {
  const match = filePath.match(/features\/([^/]+)/);
  return match ? match[1] : null;
}

export default {
  meta: {
    type: 'problem',
    messages: {
      crossFeature:
        'Cross-feature internal imports are not allowed.',
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const fromFile = context.filename;
        const imported = node.source.value;

        const fromFeature = getFeatureFromPath(fromFile);
        const toFeature = getFeatureFromPath(imported);

        if (
          fromFeature &&
          toFeature &&
          fromFeature !== toFeature
        ) {
          context.report({
            node,
            messageId: 'crossFeature',
          });
        }
      },
    };
  },
};