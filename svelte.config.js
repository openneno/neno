module.exports = {
  preprocess: {
    style: async ({ content, attributes }) => {
      if (attributes.type !== "text/postcss") return;
      return new Promise((resolve, reject) => {
        resolve({ code: "", map: "" });
      });
    }
  }
};
